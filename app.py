import sqlite3
import time
from flask import Flask, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask_cors import CORS
import pandas as pd
import random
import requests
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

CLIENT_ID = '867763481585-ei8ai8vlgc38hmv9t3jqeghdgrjv97v3.apps.googleusercontent.com'

def init_db():
    conn = sqlite3.connect('movies.db')
    c = conn.cursor()
    # Add UNIQUE constraint to prevent duplicates
    c.execute('''CREATE TABLE IF NOT EXISTS watchlists 
                 (user_id TEXT, movie_id INTEGER, title TEXT, overview TEXT,
                  UNIQUE(user_id, movie_id))''')
    conn.commit()
    conn.close()

init_db()

@app.route('/login', methods=['POST'])
def login():
    try:
        token = request.json.get('token')
        if not token:
            return jsonify({'error': 'No token provided'}), 400

        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            CLIENT_ID
        )

        if idinfo['exp'] < time.time():
            return jsonify({'error': 'Token expired'}), 401

        user_id = idinfo['sub']
        given_name = idinfo.get('given_name', '')
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'given_name': given_name
        }), 200

    except ValueError as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({'error': 'Server error', 'details': str(e)}), 500

@app.route('/watchlist', methods=['GET', 'POST'])
def watchlist():
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        try:
            conn = sqlite3.connect('movies.db')
            c = conn.cursor()
            c.execute('SELECT movie_id, title, overview FROM watchlists WHERE user_id = ?', (user_id,))
            movies = c.fetchall()
            conn.close()
            
            return jsonify([{
                'id': movie[0],
                'title': movie[1],
                'overview': movie[2]
            } for movie in movies])
        except Exception as e:
            print(f"Database error: {str(e)}")
            return jsonify({'error': 'Database error', 'details': str(e)}), 500

    elif request.method == 'POST':
        try:
            data = request.json
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            user_id = data.get('user_id')
            watchlist = data.get('watchlist', [])
            
            if not user_id:
                return jsonify({'error': 'User ID required'}), 400
            
            conn = sqlite3.connect('movies.db')
            c = conn.cursor()
            
            c.execute('DELETE FROM watchlists WHERE user_id = ?', (user_id,))
            
            for movie in watchlist:
                try:
                    c.execute(
                        'INSERT INTO watchlists (user_id, movie_id, title, overview) VALUES (?, ?, ?, ?)',
                        (user_id, movie['id'], movie['title'], movie['overview'])
                    )
                except sqlite3.IntegrityError:
                    continue
            
            conn.commit()
            return jsonify({'status': 'success'})

        except Exception as e:
            print(f"Watchlist update error: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
            return jsonify({'error': 'Server error', 'details': str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()


dataframe2 = pd.read_csv('dataframe2.csv')
q_movies = pd.read_csv('qmovies.csv')
sim_matrix = pd.read_csv('sim_matrix.csv')

def weighted_rating(x, C=7.0, m=957):
    v = x['vote_count']
    R = x['vote_average']
    return (v/(v+m) * R) + (m/(m+v) * C)

q_movies = q_movies.sort_values('score', ascending=False)
indices = pd.Series(dataframe2.index, index=dataframe2['title']).drop_duplicates()

def get_recommendations(title, cosine_sim=sim_matrix):
    idx = indices[title]
    sim_scores = list(enumerate(cosine_sim.iloc[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:11]
    movie_indices = [i[0] for i in sim_scores]
    return dataframe2.iloc[movie_indices]

@app.route('/recommendations', methods=['GET'])
def recommendations():
    titles = request.args.getlist('titles[]')
    if not titles:
        return jsonify({'error': 'No titles provided'}), 400

    all_recs = []
    seen_ids = set()

    try:
        for title in titles:
            if title not in indices:
                continue
            
            df_recs = get_recommendations(title)
            df_recs = df_recs.sort_values('score', ascending=False)

            for _, row in df_recs.iterrows():
                movie_id = row.get('id')
                if movie_id in seen_ids:
                    continue
                    
                seen_ids.add(movie_id)
                movie_info = {
                    'id': movie_id,
                    'title': row['title'],
                    'overview': row.get('overview', ''),
                    'score': float(row.get('score', 0.0))
                }
                all_recs.append(movie_info)

        return jsonify(all_recs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/top100', methods=['GET'])
def get_top100():
    try:
        top100 = q_movies[['title', 'overview', 'score', 'id']].head(100)
        data = top100.to_dict(orient='records')
        random.shuffle(data)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
