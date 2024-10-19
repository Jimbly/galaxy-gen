import { executeWithRetry } from 'glov/common/execute_with_retry';
import { cmd_parse } from './cmds';
import {
  errorReportSetDetails,
  reportingAPIPath,
  session_uid,
} from './error_report';
import { fetch } from './fetch';
import { getStoragePrefix } from './local_storage';
import { scoreWithUserID } from './score';

import type { CmdRespFunc } from 'glov/common/cmd_parse';
import type { DataObject, ErrorCallback, TSMap } from 'glov/common/types';

let project_id: string = getStoragePrefix();
export function reportSetProject(project: string): void {
  project_id = project;
  errorReportSetDetails('project', project_id);
}

let last_report_id = 0;
const RATE_LIMIT = 30*1000;
let last_report_time: TSMap<number> = {};
let queued_report: TSMap<DataObject> = {};
export function reportSend(type: string, payload: DataObject): void {
  if (queued_report[type]) {
    queued_report[type] = payload;
    return;
  }
  let now = Date.now();
  let last_time = last_report_time[type] || 0;
  if (now - last_time < RATE_LIMIT) {
    setTimeout(function () {
      let payload2 = queued_report[type];
      if (payload2) {
        delete queued_report[type];
        reportSend(type, payload2);
      }
    }, RATE_LIMIT);
    queued_report[type] = payload;
    return;
  }
  last_report_time[type] = now;
  scoreWithUserID(function (user_id: string): void {
    let url = reportingAPIPath();
    let report_uid = `${session_uid}-${++last_report_id}`;
    url += `report?project=${project_id}&type=${type}&uid=${user_id}` +
      `&rid=${report_uid}&p=${escape(JSON.stringify(payload))}`;
    function sendReport(next: ErrorCallback<string, string>): void {
      fetch({
        url,
        method: 'POST',
        timeout: 20000,
      }, next);
    }
    function done(err?: string | null): void {
      // ignore error, will happen when playing offline, etc
      if (err) {
        console.error(err);
      }
    }
    executeWithRetry<string, string>(
      sendReport, {
        max_retries: 60,
        inc_backoff_duration: 250,
        max_backoff: 30000,
        log_prefix: 'reportSend',
      },
      done,
    );
  });
}

export function reportFlush(type: string): void {
  let payload = queued_report[type];
  if (!payload) {
    return;
  }
  delete queued_report[type];
  last_report_time[type] = 0;
  reportSend(type, payload);
}

cmd_parse.register({
  cmd: 'test_report',
  help: '(Debug) - Send a test report',
  access_show: ['sysadmin'],
  func: function (str: string, resp_func: CmdRespFunc) {
    reportSend('test', { str });
    resp_func();
  },
});
