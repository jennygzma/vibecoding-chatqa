"""Run published Pantry Lane dataset validation tests."""
import runpy
import sys
from pathlib import Path

scripts = Path(__file__).resolve().parents[1] / 'projects/pantry-lane/scripts'
sys.path.insert(0, str(scripts))
runpy.run_path(str(scripts / 'test_dataset_validation.py'), run_name='__main__')
