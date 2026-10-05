"""Validate the Pantry Lane published conversation package."""
import runpy
import sys
from pathlib import Path

scripts = Path(__file__).resolve().parents[1] / 'projects/pantry-lane/scripts'
sys.path.insert(0, str(scripts))
runpy.run_path(str(scripts / 'validate_dataset.py'), run_name='__main__')
