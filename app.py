from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import random

app = Flask(__name__)
CORS(app)

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
        return jsonify({'error': 'No titles provided. Usage: /recommendations?titles=...'})

    all_recs = []
    seen_ids = set()  

    for title in titles:
        if title not in indices:
            return jsonify({'error': f'"{title}" not found in dataset.'})
        df_recs = get_recommendations(title)
        df_recs = df_recs.sort_values('score', ascending=False)

        for _, row in df_recs.iterrows():
            movie_id = row.get('id')
            if movie_id in seen_ids:
                continue
            seen_ids.add(movie_id)

            movie_info = {
                'title': row['title'],
                'overview': row.get('overview', ''),
                'score': row.get('score', 0.0),
                'id': movie_id
            }
            all_recs.append(movie_info)

    return jsonify(all_recs)



@app.route('/top100', methods=['GET'])
def get_top100():
    top100 = q_movies[['title', 'overview', 'score', 'id']].head(100)

    data = top100.to_dict(orient='records')

    random.shuffle(data)

    return jsonify(data)

@app.route('/search', methods=['GET'])
def search():
    title = request.args.getlist('title')
    results = indices[title].to_dict()
    
    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=True)
