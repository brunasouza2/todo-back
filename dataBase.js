const {
    MongoClient
} = require('mongodb')

class DataBase {

    constructor() {
        this.taskCollection = {}
    }

    async connect(collection) {
        const mongodbString = 'mongodb://localhost:27017/taskapi';
        const mongoClient = new MongoClient(mongodbString, {useNewUrlParser: true})
        const connection = await mongoClient.connect();
        const taskCollection = await connection.db('mytask').collection(collection);
        this.taskCollection = taskCollection;
        return  this.taskCollection;
    }

    async cadastrar(obj) {
        return this.taskCollection.insertOne(obj);
    }

    async listar(obj, skip=0, limit=10) {
        let filtro = {}
        if(obj.userId) {
            filtro = {
                userId: obj.userId
            }
        }
        return this.taskCollection.find(filtro).skip(skip).limit(limit).toArray();
    }

    async findUser(usuario, senha) {
        let filtro = {
            usuario: usuario,
            senha: senha
        }
        return this.taskCollection.find(filtro).toArray();
    }

    async remover(id) {
        return this.taskCollection.deleteOne({_id: id})
    }

    async atualizar(idObj, objAtualizado) {
        return this.taskCollection.update({
            _id: idObj
        }, {
            $set: objAtualizado
        })
    }

}

module.exports = DataBase

// async function main(){
//     const dataBase = new DataBase();
//     const  taskCollection = await dataBase.connect();

//     await taskCollection.insertOne({
//         nome: 'Passar pano',
//         done: false,
//         userId: 002
//     });
//     const items = await taskCollection.find().toArray();
//     console.log('items', items);
//     return;
// }

// main();