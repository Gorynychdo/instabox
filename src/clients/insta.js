const {withRealtime} = require('instagram_mqtt');
const {IgApiClient, IgCheckpointError} = require('instagram-private-api');
const Bluebird = require('bluebird');

module.exports = class Client {
    constructor(logger) {
        this.logger = logger;
        this.client = withRealtime(new IgApiClient());
    }

    authorize(settings) {
        this.client.state.generateDevice(settings.login);

        return Bluebird.try(async () => {
            this.user = await this.client.account.login(settings.login, settings.password);
            return {status: 200, state: await this.getState()};
        }).catch(IgCheckpointError, async () => {
            await this.client.challenge.auto(true);
            if (!settings.code) {
                return {status: 400, reason: 'wait for security code'};
            }
            await this.client.challenge.sendSecurityCode(settings.code);
            return {status: 200, state: await this.getState()};
        }).catch(e => {
            return {status: 400, reason: e.message};
        });
    }

    async getState() {
        const state = await this.client.state.serialize();
        delete state.constants;
        return state;
    }

    async getUnreadMessages(lastSeen) {
        let messages = [];
        try {
            for (let directItem of await this.client.feed.directInbox().items()) {
                const threadItem = {thread_id: directItem.thread_id};

                outer:
                    while (true) {
                        const thread = this.client.feed.directThread(threadItem);
                        const items = await thread.items();

                        for (let item of items) {
                            if (Number(item.timestamp) <= lastSeen) {
                                break outer;
                            }
                            if (item.user_id !== this.user.pk) {
                                messages.push(item);
                            }
                        }

                        if (!thread.isMoreAvailable()) {
                            break;
                        }
                        threadItem.oldest_cursor = items[items.length - 1].item_id;
                    }
            }
        } catch (e) {
            return {status: 404, reason: e.message};
        }

        return {status: 200, messages: messages};
    }

    async connect() {
        this.client.realtime.on('message', (data) => this.logger.info(data));
        await this.client.realtime.connect({
            irisData: await this.client.feed.directInbox().request(),
            autoReconnect: true,
            enableTrace: true,
        });
        return {status: 200, text: "OK"};
    }
}
