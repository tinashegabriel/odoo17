/** @odoo-module **/

import { browser } from "@web/core/browser/browser";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart } from "@odoo/owl";

export const IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY = "odoo-iot-linked_reports";

export function removeIoTReportIdFromBrowserLocalStorage(report_id) {
    const links = JSON.parse(browser.localStorage.getItem(IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY));
    delete links[report_id];
    if (Object.keys(links).length === 0) {
        // If the list is empty, remove the entry
        browser.localStorage.removeItem(IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY);
    } else {
        // Replace the entry in LocalStorage by the same object with the key 'report_id' removed
        browser.localStorage.setItem(
            IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY,
            JSON.stringify(links)
        );
    }
}

class MainComponent extends Component {
    setup() {
        const links = JSON.parse(
            browser.localStorage.getItem(IOT_REPORT_PREFERENCE_LOCAL_STORAGE_KEY)
        );
        const report_list = links ? Object.keys(links) : [];
        this.orm = useService("orm");
        onWillStart(async () => {
            const report_ids = await this.orm.searchRead("ir.actions.report", [
                ["id", "in", report_list],
            ]);
            this.report_list = report_ids;
        });
    }
    removeFromLocal(id) {
        removeIoTReportIdFromBrowserLocalStorage(id);
        window.location.reload();
    }
}

MainComponent.template = "iot.delete_printer";

registry.category("actions").add("iot_delete_linked_devices_action", MainComponent);

export default MainComponent;
