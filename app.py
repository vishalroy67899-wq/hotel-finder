from datetime import datetime
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'contacts.db'

app = Flask(__name__, static_folder='.', static_url_path='')

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);
'''


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()


def insert_contact(name: str, email: str, subject: str, message: str) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO contacts (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)',
            (name, email, subject, message, datetime.utcnow().isoformat())
        )
        conn.commit()
        return cursor.lastrowid


@app.route('/api/contact', methods=['POST'])
def contact_form():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'error': 'Request body must be JSON.'}), 400

    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip()
    subject = str(data.get('subject', '')).strip()
    message = str(data.get('message', '')).strip()

    if not (name and email and subject and message):
        return jsonify({'error': 'All fields are required.'}), 400

    contact_id = insert_contact(name, email, subject, message)
    return jsonify({'message': 'Contact saved successfully.', 'id': contact_id}), 201


@app.route('/api/contacts', methods=['GET'])
def list_contacts():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute('SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY created_at DESC')
        contacts = [dict(row) for row in cursor.fetchall()]
    return jsonify({'contacts': contacts})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path == '':
        return send_from_directory(app.static_folder, 'index.html')
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
