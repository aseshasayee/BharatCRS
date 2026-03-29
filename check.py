from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['bharatcrs_db']
c = db['complaints'].find_one()
if c:
    print('user_id:', c['common_metadata'].get('user_id'), 'citizen_id:', c['common_metadata'].get('citizen_id'))
else:
    print('No doc')
