const koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('@koa/router');

module.exports = class Server {
    constructor(logger, client) {
        this.logger = logger;
        this.client = client;
        this.app = new koa();
        this.app.use(bodyParser());

        const router = new Router();

        this.app.use(async (ctx, next) => {
            await next();
            this.logger.info(`${ctx.method} ${ctx.path} ${ctx.status}`)
        })

        router
            .post('/auth', this.authorize.bind(this))
            .post('/connect', this.connect.bind(this))
            .post('/messages', this.messages.bind(this))

        this.app.use(router.routes());
        this.app.use(router.allowedMethods());
    }

    start() {
        this.app.listen(3000)
        this.logger.info('http server started on 3000');
    }

    async authorize(ctx) {
        ctx.body = await this.client.authorize(ctx.request.body);
    }

    async connect(ctx) {
        ctx.body = await this.client.connect();
    }

    async messages(ctx) {
        ctx.body = await this.client.getUnreadMessages(ctx.request.body.lastSeen);
    }
};
