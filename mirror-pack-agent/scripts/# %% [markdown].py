# %% [markdown]
# _Connecting to .venv (Python 3.15.0)..._

# %%
# tests/test_utils.py

import unittest
import sys
import os

# Add the parent directory to the path to allow importing 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.utils import add, subtract

class TestUtils(unittest.TestCase):
    """Test cases for the utility functions."""

    def test_add(self):
        """Test the add function with various inputs."""
        self.assertEqual(add(2, 3), 5)
        self.assertEqual(add(-1, 1), 0)
        self.assertEqual(add(-5, -5), -10)
        self.assertAlmostEqual(add(0.1, 0.2), 0.3)

    def test_add_type_error(self):
        """Test that the add function raises a TypeError for non-numeric input."""
        with self.assertRaises(TypeError):
            add('a', 5)
        with self.assertRaises(TypeError):
            add(5, 'a')

    def test_subtract(self):
        """Test the subtract function."""
        self.assertEqual(subtract(10, 5), 5)
        self.assertEqual(subtract(-1, 1), -2)
        self.assertEqual(subtract(5, 10), -5)

    def test_subtract_type_error(self):
        """Test that the subtract function raises a TypeError for non-numeric input."""
        with self.assertRaises(TypeError):
            subtract('a', 5)

if __name__ == '__main__':
    unittest.main()


