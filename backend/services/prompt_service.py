import hashlib
from pathlib import Path

from schema import PromptCategory, PromptCategoryKind, PromptContentResponse, PromptInfo


class PromptService:
    def __init__(self):
        self.prompts_dir = Path(__file__).parent.parent / "prompts"

    def get_available_prompts(self) -> list[PromptCategory] | None:
        """
        promptsディレクトリからプロンプトファイル一覧を取得
        """
        prompt_list: list[PromptCategory] = []

        if not self.prompts_dir.exists():
            return None

        for category in PromptCategoryKind:
            category_dir = self.prompts_dir / category.value
            if not category_dir.exists():
                continue

            prompt_files_in_category = category_dir.glob("*.txt")
            prompt_infos = []

            for prompt_file in prompt_files_in_category:
                name = prompt_file.stem
                description = self._extract_description(prompt_file)
                sha256 = self._calc_sha256(prompt_file.read_bytes())
                prompt_infos.append(
                    PromptInfo(
                        name=name,
                        category=category,
                        description=description,
                        sha256=sha256,
                    )
                )

            if prompt_infos:
                prompt_list.append(PromptCategory(name=category, prompts=prompt_infos))

        # return None when no prompts found
        if not prompt_list:
            return None
        return prompt_list

    def load_prompt_content(
        self, prompt_name: str, category: PromptCategoryKind
    ) -> PromptContentResponse | None:
        """
        指定されたプロンプト名のファイル内容を読み込み
        """
        file_path = self.prompts_dir / category.value / f"{prompt_name}.txt"

        if not file_path.exists():
            return None

        try:
            content_bytes = file_path.read_bytes()
            content = content_bytes.decode("utf-8")
            sha256 = self._calc_sha256(content_bytes)
            return PromptContentResponse(
                name=prompt_name, category=category, content=content, sha256=sha256
            )
        except Exception as e:
            print(f"Error loading prompt {prompt_name}: {e}")
            return None

    def _extract_description(self, file_path: Path) -> str | None:
        """
        プロンプトファイルの最初のコメント行から説明を抽出
        """
        try:
            with open(file_path, encoding="utf-8") as f:
                first_line = f.readline().strip()

                # # で始まるコメント行があれば説明として使用
                if first_line.startswith("#"):
                    return first_line[1:].strip()

                # 最初の文（ピリオドまで）を説明として使用
                first_sentence = first_line.split(".")[0]
                if (
                    first_sentence and len(first_sentence) < 100
                ):  # 空文字列でなく、短い場合のみ説明として使用
                    return first_sentence

        except Exception:
            pass

        return None

    def _calc_sha256(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()
