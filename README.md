# Auth Service
### Installation

```bash
$ npm install
```

### Adding Environment Variables

make a .env file and add the required environment variables
```bash
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=auth
NODE_ENV=development
PORT=3000
AT_SECRET=at-secret111
RT_SECRET=rt-secret111
AT_EXPIRY=60d
RT_EXPIRY=60d
ISS=url
DEBUG=*
```
for server, the environment variables have to be put in GitHub action secrets
```
First convert all contents of the .env file to BASE64.
Put the BASE64 string in ENV_DEV_BASE64 Github Action Secrets.
```


### Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

### Registration FLOW
```
User open app
1-> POST /user - <userObject>, accessToken, refreshToken
2-> POST /user/:id/device-details
3-> POST /otp
4-> POST /verify-otp - <userObject>, accessToken, refreshToken
5-> POST /user/:id/device-details
```
