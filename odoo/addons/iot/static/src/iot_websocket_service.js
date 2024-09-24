/** @odoo-module **/

import { registry } from "@web/core/registry";
import { browser } from "@web/core/browser/browser";
import { session } from "@web/session";
import {
    IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY,
    removeIoTReportIdFromBrowserLocalStorage,
} from "./client_action/delete_local_storage";

export class IotWebsocket {
    jobs = {};

    constructor(bus_service, notification, orm) {
        this.notification = notification;
        this.bus_service = bus_service;
        this.orm = orm;
    }

    async getDevicesFromIds(stored_content) {
        return await this.orm.call("ir.actions.report", "get_devices_from_ids", [
            0,
            stored_content,
        ]);
    }

    async addJob(stored_content, args) {
        const [report_id, active_record_ids, report_data, uuid] = args;
        const response = await this.getDevicesFromIds(stored_content).catch((error) => {
            removeIoTReportIdFromBrowserLocalStorage(report_id);
            throw error;
        });
        this.jobs[uuid] = response;
        // The IoT is supposed to send back a confirmation request when the operation
        // is done. This request will trigger the `jobs[uuid]` to be removed
        // If the `jobs[uuid]` is still there after 10 seconds,
        // we assume the connection to the printer failed
        setTimeout(() => {
            if (this.jobs[uuid].length !== 0) {
                for (const device in this.jobs[uuid]) {
                    this.notification.add("Check if the printer is still connected", {
                        title: `Connection to printer failed ${this.jobs[uuid][device]["name"]}`,
                        type: "danger",
                    });
                }
            }
            delete this.jobs[uuid];
        }, 10000);
        await this.orm.call("ir.actions.report", "render_and_send", [
            report_id,
            response,
            active_record_ids,
            report_data,
            uuid,
        ]);
    }

    setJobInLocalStorage(value, args) {
        let links = JSON.parse(
            browser.localStorage.getItem(IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY)
        );
        if (links === null || typeof links !== "object") {
            links = {};
        }
        links[args[0]] = value;
        browser.localStorage.setItem(
            IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY,
            JSON.stringify(links)
        );
        this.addJob(value, args);
    }
}


export const IotWebsocketService = {
    dependencies: ["bus_service", "notification", "orm"],
            
    async start(env, {bus_service, notification, orm}) {
        let ws = new IotWebsocket(bus_service, notification, orm);

        const iot_channel = session.iot_channel;
        if (iot_channel)
        {
            bus_service.addChannel(iot_channel);
            bus_service.addEventListener("notification", async (message) => {
                for (let i in message['detail']) {
                    if (message['detail'][i]['type'] == "print_confirmation" && ws.jobs[message['detail'][i]['payload']['print_id']]) {
                        const deviceId = message['detail'][i]['payload']['device_identifier'];
                        const printId = message['detail'][i]['payload']['print_id'];
                        delete ws.jobs[printId][ws.jobs[printId].findIndex(element => element && element['identifier'] == deviceId)];
                    }
                }
            })
        }
        return ws;
    },
}

registry.category("services").add("iot_websocket", IotWebsocketService);
