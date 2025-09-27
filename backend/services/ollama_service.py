import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path

from ollama import AsyncClient, GenerateResponse, Options
from pydantic.json_schema import JsonSchemaValue

from schema import (
    PromptInfo,
    Status,
    ValidationFile,
    ValidationIssue,
    ValidationPromptResult,
)


@dataclass
class OllamaOptions:
    # Both seed and temperature are currently set to ollama's default value.
    seed: int = 0
    temperature: float = 0.8


class OllamaService:
    def __init__(
        self,
        host: str | None = None,
        model: str | None = None,
        options: OllamaOptions | None = None,
    ):
        self.host = host or os.getenv("OLLAMA_HOST", "http://ollama:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "gemma3n:e4b")
        # self.client = Client(host=self.host)
        self.client = AsyncClient(host=self.host)
        self._options: Options = self._construct_options(options or OllamaOptions())

        self._schema: JsonSchemaValue = self._load_format_schema(
            Path(os.getenv("OLLAMA_FORMAT_PATH", "format/generate.schema.json"))
        )

    def _construct_options(self, options: OllamaOptions) -> Options:
        return Options(seed=options.seed, temperature=options.temperature)

    def fix_unescaped_quotes_in_json_strings(self, json_str: str) -> str:
        """JSON文字列値内の未エスケープダブルクオートを修正"""

        out = []
        in_string = False
        escape = False

        i = 0
        n = len(json_str)
        while i < n:
            ch = json_str[i]

            if ch == '"' and not escape:
                if not in_string:
                    # 文字列開始
                    in_string = True
                    out.append(ch)
                else:
                    # 文字列の中で " を発見。終端かどうかを推定
                    j = i + 1
                    while j < n and json_str[j].isspace():
                        j += 1
                    # 終端候補かどうか：直後が , } ] または入力末尾
                    is_closing = (j >= n) or (json_str[j] in ":,}]")
                    if is_closing:
                        in_string = False
                        out.append(ch)  # 終端の " はそのまま
                    else:
                        out.append('\\"')  # 文字列内の裸の " をエスケープ
                i += 1
                continue

            if ch == "\\" and not escape:
                escape = True
                out.append(ch)
                i += 1
                continue

            if escape:
                # 直前がバックスラッシュだったので通常処理に戻る
                escape = False
                out.append(ch)
                i += 1
                continue

            out.append(ch)
            i += 1

        return "".join(out)

    # async def validate_files_with_prompt(
    #     self,
    #     files: list[ValidationFile],
    #     prompt_info: PromptInfo,
    #     prompt_content: str,
    #     prompt_task: ValidationPromptResult,
    # ) -> None:
    #     loop = asyncio.get_event_loop()
    #     return await loop.run_in_executor(
    #         None,
    #         self._validate_files_with_prompt,
    #         files,
    #         prompt_info,
    #         prompt_content,
    #         prompt_task,
    #     )

    async def validate_files_with_prompt(
        self,
        files: list[ValidationFile],
        prompt_info: PromptInfo,
        prompt_content: str,
        prompt_task: ValidationPromptResult,
    ) -> None:
        """Validate multiple with a single prompt."""
        prompt = self._construct_prompt(files, prompt_content)
        try:
            # TODO: do we need "thinking" options when the model supports it
            # generate_response: GenerateResponse = self.client.generate(
            generate_response: GenerateResponse = await self.client.generate(
                model=self.model,
                prompt=prompt,
                stream=False,
                options=self._options,
                format=self._schema,
            )
        except Exception as e:
            # TODO NEED LOGGING
            prompt_task.status = Status.failed
            prompt_task.error_message = str(e)
            return

        try:
            response_text = generate_response["response"]
            total_duration: int = generate_response["total_duration"]  # in nanoseconds
            load_duration: int = generate_response["load_duration"]  # in nanoseconds
            prompt_eval_duration: int = generate_response[
                "prompt_eval_duration"
            ]  # in nanoseconds
            eval_duration: int = generate_response["eval_duration"]  # in nanoseconds

            response: list[ValidationIssue] | None = (
                self._extract_issues_from_response_text(response_text)
            )
        except json.decoder.JSONDecodeError as e:
            # TODO NEED LOGGING
            prompt_task.status = Status.failed
            prompt_task.error_message = f"Failed to parse response: {str(e)}"
            return

        prompt_task.status = Status.completed
        prompt_task.result = response
        prompt_task.total_duration_ns = total_duration
        prompt_task.eval_duration_ns = eval_duration
        prompt_task.load_duration_ns = load_duration
        prompt_task.prompt_eval_duration_ns = prompt_eval_duration
        return

    def _extract_issues_from_response_text(
        self, text: str
    ) -> list[ValidationIssue] | None:
        # TODO escaping quotes in json string may be needed if exists

        if not text.strip():
            raise ValueError("Response is empty")

        tmp_result = json.loads(text)
        if isinstance(tmp_result, list):
            return [ValidationIssue.model_validate(item) for item in tmp_result]
        else:
            raise ValueError("Response is not in a format as expected")

    def _construct_prompt(
        self, files: list[ValidationFile], prompt_content: str
    ) -> str:
        prompt = f"{prompt_content}\n\n"
        for file in files:
            prompt += (
                f"\n\n---\nFile Name: {file.file_name}\nFile Content:\n{file.content}"
            )
        return prompt

    def _load_format_schema(self, path: Path) -> JsonSchemaValue:
        """Load JSON schema from a file."""
        if not path.exists():
            raise FileNotFoundError(f"Schema file not found: {path}")

        with path.open("r", encoding="utf-8") as f:
            try:
                schema = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON schema in the file {path}: {e}") from e

        return schema

    def check_model_availability(self) -> bool:
        try:
            models = self.client.list()
            return any(
                model["name"] == self.model for model in models.get("models", [])
            )
        except Exception:
            return False
