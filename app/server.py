from __future__ import annotations

import logging

from flask import Flask, jsonify, request

from app.processor import learn_rules_for_chat_folder, process_chat_folder

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@app.post("/process")
def process_route():
    data = request.get_json(silent=True) or {}
    folder_name = data.get("chat_folder")
    refine = bool(data.get("refine"))
    if not folder_name:
        return jsonify({"error": "chat_folder is required"}), 400

    try:
        result = process_chat_folder(folder_name, refine=refine)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "chat_folder": folder_name,
        "output_path": str(result.output_path),
        "qa_count": len(result.output_json.get("qa", [])),
    })


@app.post("/learn-rules")
def learn_rules_route():
    data = request.get_json(silent=True) or {}
    folder_name = data.get("chat_folder")
    max_rules = data.get("max_rules", 10)
    if not folder_name:
        return jsonify({"error": "chat_folder is required"}), 400

    try:
        max_rules = int(max_rules)
    except Exception:
        return jsonify({"error": "max_rules must be an integer"}), 400

    try:
        result = learn_rules_for_chat_folder(folder_name, max_rules=max_rules)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "chat_folder": folder_name,
        "output_path": str(result.output_path),
        "rule_count": len(result.output_json.get("rules", [])),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
