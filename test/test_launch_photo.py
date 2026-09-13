from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from app.main import launch_photo_path


class LaunchPhotoPathTests(TestCase):
    def test_accepts_first_supported_image_path(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            text = root / "说明.txt"
            image = root / "照片.jpg"
            text.write_text("not an image", encoding="utf-8")
            image.write_bytes(b"test")
            self.assertEqual(launch_photo_path([str(text), str(image)]), image.resolve())

    def test_ignores_options_and_missing_paths(self):
        self.assertIsNone(launch_photo_path(["--debug", "Z:/missing.jpg"]))
