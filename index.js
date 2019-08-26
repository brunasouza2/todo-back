// const http = require('http');

// const hostname = '127.0.0.1';
// const port = 3000;

// const server = http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'text/plain');
//   res.end('Hello World\n');
// });

// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });

const Db = require('./dataBase')
const Hapi = require('hapi')
const Joi = require('joi')
const HapiSwagger = require('hapi-swagger')
const Vision = require('vision')
const Inert = require('inert')
const Jwt = require('jsonwebtoken')
const HapiJwt = require('hapi-auth-jwt2')
const { ObjectId } = require('mongodb')
const app = new Hapi.Server({
    port:3000,
    routes: {
        cors: {
            origin: ['*'],
        }
    }
})

const defaultHeader = Joi.object({
    authorization: Joi.string().required()
}).unknown()

const MINHA_CHAVE_SECRETA="123456";
const USER = {
    usuario: "admin",
    senha: "admin"
}

async function main() {
    try{
        const database = new Db();
        await database.connect('taskapi');
        const databaseUser = new Db();
        await databaseUser.connect('usuario');

        await app.register([
            HapiJwt,
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                options: {
                    documentationPath: '/v1/documentation',
                    info: {
                        title: 'API ToDo - Bruna',
                        version: 'v1.0'
                    },
                    lang: 'pt'
                }
            }
        ])

        app.auth.strategy('jwt', 'jwt', {
            key: MINHA_CHAVE_SECRETA,
            validate: (dado, request) => {
                // poderiamos validar o usuario no banco
                // verificar se está com a conta em dia
                // ou mesmo se continua ativo na base
                return {
                    isValid: true
                }
            }
        })

        app.auth.default('jwt')

        app.route([
            {
                // localhost:3000/v1/todos?nome=Passar pano
                // localhost:3000/v1/todos?skip=1&limit=1
                method : 'GET',
                path: '/v1/todos',
                config:{
                    tags: [ 'api' ],
                    description: 'Listar Todos',
                    notes: 'Pode filtrar por nome e paginar',
                    validate: {
                        failAction: (request, h, err) =>{
                            throw err   
                        },
                        query: {
                            userId: Joi.string().max(256).min(2),
                            skip: Joi.number().default(0),
                            limit: Joi.number().max(10).default(10)
                        },
                        headers: defaultHeader
                    }
                },
                handler: async (request) => {
                    try{
                        const {query} = request
                        const {skip, limit} = query
                        return database.listar(query, parseInt(skip), parseInt(limit))
                    }catch(error){
                        console.error('Algo está errado', error)
                    }
                }
            },
            {
                method: 'POST',
                path: '/v1/todos',   
                config: {
                    tags: [ 'api' ],
                    description: 'Cadastrar Todos',
                    notes: 'Pode cadastrar nome, done e idUser',
                    validate: {
                        failAction: (r, h, erro) => {
                            throw erro
                        },
                        payload: {
                            nome: Joi.string().required(),
                            done: Joi.boolean().required(),
                            userId: Joi.string()
                        },
                        headers: defaultHeader
                    }
                },             
                handler: async (request) => {
                    try {
                        const {payload} = request
                        return database.cadastrar(payload)
                    } catch (error) {
                        console.error('Algo está errado', error)
                    }
                }
            },
            {
                method: 'DELETE',
                path: '/v1/todos/{id}',
                config: {                    
                    tags: [ 'api' ],
                    description: 'Remover Todo',
                    notes: 'Remove por id',
                    validate : {
                        failAction: (request, h, err) =>{
                            throw err   
                        },
                        params: {
                            id: Joi.string().max(40).required()
                        },
                        headers: defaultHeader
                    }
                },
                async handler(request) {
                    try {
                        const { id } = request.params
                        return database.remover(ObjectId(id))
                    } catch (error) {
                        console.log('Algo está errado', error);
                    }
                } 
            },
            {
                method: 'PATCH',
                path: '/v1/todos/{id}',
                config: {
                    tags: [ 'api' ],
                    description: 'Atualizar Todo',
                    notes: 'atualizar todo por id',
                    validate: {
                        failAction (r, h, error){
                            throw error
                        },
                        params: {
                            id: Joi.string().max(40).required()
                        },
                        payload: {
                            nome: Joi.string().required(),
                            done: Joi.boolean().required(),
                            userId: Joi.string()
                        },
                        headers: defaultHeader
                    }
                },
                async handler (request, h) {
                    try {
                        const { id } = request.params
                        const { payload } = request
                        const v = await database.atualizar(ObjectId(id),payload)
                        return h.response(v).code(201)
                    } catch (error) {
                        console.log('Algo está errado', error)
                    }
                }
            },
            {
                method: 'POST',
                path: '/v1/login',
                config: {
                    auth: false,
                    tags: [ 'api' ],
                    description: 'Fazer login',
                    notes: 'login com user e senha',
                    validate: {
                        failAction (r, h, erro) {
                            throw erro
                        },
                        payload: {
                            usuario: Joi.string().max(10).required(),
                            senha: Joi.string().min(3).max(100).required()
                        }
                    }
                },
                async handler({payload : {usuario, senha}}) {
                    try {

                        let user = await databaseUser.findUser(usuario, senha)

                        if(user==undefined || user.length === 0)
                        return false;

                        const tokenPayload = {usuario}
                        const token = Jwt.sign(tokenPayload, MINHA_CHAVE_SECRETA, {
                            expiresIn: "1m",
                        });
                        user = {...user, token:token};
                        return {
                            user
                        }
                    } catch (error) {
                        console.error('Algo está errado', error)
                    }
                }
            },
            {
                method: 'POST',
                path: '/v1/register',
                config: {
                    auth: false,
                    tags: [ 'api' ],
                    description: 'Registrar usuario',
                    notes: 'com user e senha',
                    validate: {
                        failAction (r, h, erro) {
                            throw erro
                        },
                        payload: {
                            usuario: Joi.string().max(10).required(),
                            senha: Joi.string().min(3).max(100).required()
                        }
                    }
                },
                async handler(request) {
                    try {
                        const {payload} = request
                        return databaseUser.cadastrar(payload)
                    } catch (error) {
                        console.error('Algo está errado', error)
                    }
                }                
            },
            {
                method: 'POST',
                path: '/v1/finduser',
                config: {
                    auth: false,
                    tags: [ 'api' ],
                    description: 'Fid sdfsdf',
                    notes: 'com user e senha',
                    validate: {
                        failAction (r, h, erro) {
                            throw erro
                        },
                        payload: {
                            usuario: Joi.string().max(10).required(),
                            senha: Joi.string().min(3).max(100).required()
                        }
                    }
                },
                async handler({payload : {usuario, senha}}) {
                    try {
                        return databaseUser.findUser(usuario, senha)
                    } catch (error) {
                        console.error('Algo está errado', error)
                    }
                }   
            }
        ])

        await app.start()
        console.log(`servidor rodando ${app.info.host}:${app.info.port}`)
    }catch(error){
        console.error('Algo está errado', error);
    }
}

main();