from flask import Flask, Response, request, url_for, render_template, jsonify
import sqlite3
from werkzeug.exceptions import abort
import time
import gzip
import json

# todo
# list view to be able to sort trees by age or gattung and mouse over to highlight the tree
# clear filters
# add caching
# add stats
# allow uploading photos
# put askCPT field to make a query: what is the oldest tree, which trees are older than 1900, how many trees planted in year 2022 etc

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('tree.db')
    # conn = sqlite3.connect('/home/nurpinar/mysite/tree.db')
    conn.row_factory = sqlite3.Row
    return conn

def insertTableQuartier():
    conn = get_db_connection()
    query = "CREATE TABLE IF NOT EXISTS Quartier (Id INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT UNIQUE);"
    conn.execute(query)
    query = "SELECT DISTINCT Quartier from Trees;"
    rows = conn.execute(query).fetchall()
    for row in rows:
        query = f"INSERT INTO Quartier (Name) VALUES ('{row[0]}');"
        conn.execute(query)
    conn.commit()
    conn.close()

def updateTableQuartier():
    conn = get_db_connection()
    query = "UPDATE Trees \
        SET QuartierId = (SELECT Id FROM Quartier WHERE Quartier.Name = Trees.Quartier) \
        WHERE QuartierId IS NULL;"

@app.route('/api/tables/all',  methods=["GET"])
def getTables():
    fixedTables = {}
    conn = get_db_connection()
    try:
        fixedTables['colorsObj'] = read_table(conn, 'Colorcodes')
        fixedTables['statusObj'] = read_table(conn, 'Status')
        fixedTables['quartierObj'] = read_table(conn, 'Quartier')
        fixedTables['kategorieObj'] = read_table(conn, 'Kategories')
        fixedTables['genauigkeitObj'] = read_table(conn, 'Genauigkeit')
        fixedTables['baumTypeObj'] = read_table(conn, 'BaumType')
        fixedTables['baumGattungObj'] = read_table(conn, 'BaumGattungLat')
        fixedTables['baumArtObj'] = read_table(conn, 'BaumArtLat')
        fixedTables['genusesTypesCounts'] = getGenusesTypesCounts(conn)
        return {'success': True, 'data': fixedTables}
    except sqlite3.Error as e:
        return {'success': False, 'error': e}
    finally:
        conn.close()

@app.route('/api/trees/id/<int:id>')
def getFullTreeinfo(id):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM Trees WHERE Id=?;', (id, )).fetchone()
    conn.close()
    return {'success': True, 'data':  {
        'id': row['Id'],
        'poi_id': row['PoiId'],
        'kategorie_id': row['KategorieId'],
        'status_id': row['StatusId'],
        'baumtyp_id': row['BaumtypId'],
        'genauigkeit_id': row['GenauigkeitId'],
        'strasse': row['Strasse'],
        'baumname_lat': row['Baumnamelat'],
        'baumname_deu': row['Baumnamedeu'],
        'pflanzjahr': row['Pflanzjahr'],
        'kronendurchmesser': row['Kronendurchmesser'],
        'lat': row['Lat'],
        'lon': row['Lon'],
        'baumartlat_id': row['BaumArtLatId'],
        'baumgattunglat_id': row['BaumGattungLatId'],
        'quartier_id': row['QuartierId']
    }}


@app.route('/api/trees/poiid/<string:id>')
def getTreeByPoiId(id):
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM Trees WHERE PoiId=?;', (id, ))
    outer_map = getTreeRows(rows)
    conn.close()
    return {'success': True, 'data': outer_map}

@app.route('/api/trees/all',  methods=["GET"])
def allTrees():
    conn = get_db_connection()
    rows = conn.execute('SELECT  * FROM Trees;').fetchall()
    data = getTreeRows(rows)
    conn.close()
    return getCompressedResponse(data)

@app.route('/api/filter_trees',  methods=["GET"])
def trees():
    query = "SELECT * FROM Trees "
    conditions = []

    id = request.args.get('id')
    if id:
        query += f"WHERE Id={id};"
    else: 
        baumArtIds = request.args.get('baumArtIds')
        baumtyp = request.args.get('baumtyp')
        genauigkeit = request.args.get('genauigkeit')
        status = request.args.get('status')
        quartier = request.args.get('quartier')
        kategorie = request.args.get('kategorie')
        minPflanzJahr = request.args.get('minPflanzJahr')
        maxPflanzJahr = request.args.get('maxPflanzJahr')
        minKronendurchMesser = request.args.get('minKronendurchMesser')
        maxKronendurchMesser = request.args.get('maxKronendurchMesser')
        boundsNE = request.args.get('northEast')
        boundsSW = request.args.get('southWest')

        ne_lat, ne_lng = boundsNE.split(",")
        sw_lat, sw_lng = boundsSW.split(",")
        
        coord_condition = f"Lat BETWEEN {sw_lat} AND {ne_lat} AND Lon BETWEEN {sw_lng} AND {ne_lng}"
        conditions.append(coord_condition)

        if(minPflanzJahr or maxPflanzJahr):
            if (not minPflanzJahr):
                minPflanzJahr = 0
            if (not maxPflanzJahr):
                maxPflanzJahr = 2300
            pflanzjahr_condition = f"Pflanzjahr BETWEEN {minPflanzJahr} AND {maxPflanzJahr}"
            conditions.append(pflanzjahr_condition)

        if (minKronendurchMesser or maxKronendurchMesser):
            if (not minKronendurchMesser):
                minKronendurchMesser = 0
            if (not maxKronendurchMesser):
                maxKronendurchMesser = 1000
            kronendurchmesser_condition = f"Kronendurchmesser BETWEEN {minKronendurchMesser} AND {maxKronendurchMesser}"
            conditions.append(kronendurchmesser_condition)

        if baumArtIds:
            art_condition = f"BaumArtLatId IN ({baumArtIds})"
            conditions.append(art_condition)

        if baumtyp:
            baumtyp_condition = f"BaumtypId = '{baumtyp}'"
            conditions.append(baumtyp_condition)
        if genauigkeit:
            genauigkeit_condition = f"GenauigkeitId = {genauigkeit}"
            conditions.append(genauigkeit_condition)

        if status:
            status_condition = f"StatusId = '{status}'"
            conditions.append(status_condition)

        if quartier:
            quartier_condition = f"QuartierId = '{quartier}'"
            conditions.append(quartier_condition)

        if kategorie:
            kategorie_condition = f"KategorieId = '{kategorie}'"
            conditions.append(kategorie_condition)

        if len(conditions):
            query += "WHERE "
            query += " AND ".join(conditions)
    
    conn = get_db_connection()
    rows = conn.execute(query).fetchall()
    conn.close()
    data = getTreeRows(rows)
    return getCompressedResponse(data)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return render_template('test.html')

def read_table(conn, table_name):
    rows = conn.execute('SELECT * FROM ' + table_name + ' ORDER BY Name ASC;').fetchall()
    my_dict = {}
    for row in rows:
        my_dict[row['Id']] = row['Name']
    return my_dict

def getGenusesTypesCounts(conn):
    start_time = time.time()
    rows = conn.execute('SELECT BaumGattungLat.Name, BaumArtLat.Id as BaumArtLatId, BaumArtLat.Name as BaumArtLatName \
          FROM BaumGattungLat \
          INNER JOIN BaumArtLat ON BaumArtLat.BaumGattungLatId=BaumGattungLat.Id \
          ORDER BY BaumGattungLat.Name ASC, BaumArtLatName ASC;')
    baum_dict = {}
    count_dict = {}
    counts = conn.execute('SELECT * FROM BaumArtLatCounts;')
    for row in counts:
        count_dict[row['Id']] = row['Count']

    for row in rows:
        name = row['Name']
        baumArtLatName = row['baumArtLatName']
        if name not in baum_dict:
            baum_dict[name] = {}
        if 'baumArtLatNames' not in baum_dict[name]:
            baum_dict[name]['baumArtLatNames'] = []
        baum_dict[name]['baumArtLatNames'].append({'baumArtLatName': baumArtLatName, 'count': count_dict[row['BaumArtLatId']]})
    return baum_dict

def getTreeRows(rows):
    outer_map = {}
    for row in rows:
        tree = {
                'id': row['Id'],
                # 'poi_id': row['PoiId'],
                # 'kategorie_id': row['KategorieId'],
                # 'status_id': row['StatusId'],
                # 'baumtyp_id': row['BaumtypId'],
                # 'genauigkeit_id': row['GenauigkeitId'],
                # 'strasse': row['Strasse'],
                'baumname_lat': row['Baumnamelat'],
                'baumname_deu': row['Baumnamedeu'],
                # 'pflanzjahr': row['Pflanzjahr'],
                # 'kronendurchmesser': row['Kronendurchmesser'],
                'lat': row['Lat'],
                'lon': row['Lon']
                # 'quartier_id': row['QuartierId'],
            }
        genusId = row['BaumGattungLatId']
        typeId = row['BaumArtLatId']
        if genusId not in outer_map:
            outer_map[genusId] = {}
        if typeId not in outer_map[genusId]:
            outer_map[genusId][typeId] = []
        outer_map[genusId][typeId].append(tree)
    return outer_map

def getCompressedResponse(data):
    response = {'success': True, 'data': data}
    json_data = json.dumps(response)
    compressed_data = gzip.compress(json_data.encode('utf-8'), compresslevel=1)
    return Response(compressed_data, mimetype='application/json', headers={
        'Content-Encoding': 'gzip'
    })

if __name__ == '__main__':
    app.run()