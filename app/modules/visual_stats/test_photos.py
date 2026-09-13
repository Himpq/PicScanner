import json
import tempfile
import unittest
from pathlib import Path

from .backend import VisualStatsModule
from .taxonomy import PRIMARY_LABELS, TAXONOMY_VERSION


class SubjectPhotosTest(unittest.TestCase):
    def test_complete_paging_and_shared_membership(self):
        with tempfile.TemporaryDirectory() as folder:
            module = VisualStatsModule()
            module._db_path = Path(folder) / 'results.db'
            module._config = None
            module._ensure_schema()
            first, second = [item['key'] for item in PRIMARY_LABELS[:2]]
            photos = [{'id': i, 'path': f'/photos/{i}.jpg', 'relative_path': f'{i}.jpg'} for i in range(1, 8)]
            vectors = [{'path': p['path'], 'item_key': p['relative_path'], 'source_signature': 'current', 'dim': 3} for p in photos]
            module._eligible_photos = lambda sid: photos[:6]  # Deleted/hidden photo 7.
            module._root_path = lambda sid: ''
            module._vector_rows = lambda sid, root, include_embeddings: vectors
            with module._connect() as conn:
                for sid, i in [('source', i) for i in range(1, 8)] + [('other', 99)]:
                    scores = {first: 0.8, second: 0.795 if i == 2 else 0.1}
                    conn.execute(
                        'INSERT INTO photo_labels VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        (sid, f'{i}.jpg', i, f'/photos/{i}.jpg', 'old' if i == 6 else 'current',
                         TAXONOMY_VERSION, 'test', first, first, 0.8, 0.1, 0, '[]', json.dumps(scores), 'now'),
                    )
            ids = []
            after = 0
            while True:
                page = module.photos('source', first, after, 2)
                self.assertTrue(page['success'])
                self.assertEqual(page['total'], 5)
                ids.extend(item['photo_id'] for item in page['items'])
                after = page['next_after']
                if not page['has_more']:
                    break
            self.assertEqual(ids, [1, 2, 3, 4, 5])
            shared = module.photos('source', second)
            self.assertEqual([item['photo_id'] for item in shared['items']], [2])
            self.assertFalse(module.photos('source', 'invalid')['success'])
            self.assertEqual(module.photos('source', first, 100)['items'], [])


if __name__ == '__main__':
    unittest.main()
