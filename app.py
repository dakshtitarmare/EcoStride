import sys
import os

# Ensure project root is in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
