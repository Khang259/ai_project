"""
Standalone HTTP Server Runner
Chạy REST API server độc lập
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from logic.hash_tables import HashTables
from api.http_server import init_api, start_server
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

if __name__ == "__main__":
    # Load hash tables
    hash_tables = HashTables("../logic/config.json")
    
    # Initialize API
    init_api(hash_tables)
    
    # Start server
    print("=" * 50)
    print("🚀 Point Status API Server")
    print("=" * 50)
    print("📍 URL: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("=" * 50)
    
    start_server(host="0.0.0.0", port=8000)