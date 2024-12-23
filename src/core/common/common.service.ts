import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { parse } from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment/moment';

@Injectable()
export class CommonService {
  toTimestamp(strDate): number {
    const datum = Date.parse(strDate) / 1000;
    return datum;
  }

  mapper(source: any, destination: any, patch: boolean): any {
    for (const property in source) {
      if (destination.hasOwnProperty(property)) {
        if (
          source[property] != null &&
          source[property].constructor != null &&
          source[property].constructor.name == 'Date'
        ) {
          destination[property] = source[property];
        } else if (typeof source[property] === 'object') {
          if (source[property] == null) {
            destination[property] = destination[property] || null;
          } else {
            destination[property] = destination[property] || {};
            this.mapper(source[property], destination[property], patch);
          }
        } else {
          destination[property] = source[property];
        }
      }
    }
    return destination;
  }

  isPosRequest(appId: string) {
    return appId == 'com.example.pos_flutter_app';
  }

  async readCSVData(dataStream): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedCsv = parse(dataStream, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  async readCsvData(file) {
    const fileBufferInBase64: string = file.buffer.toString('base64');
    const buffer = Buffer.from(fileBufferInBase64, 'base64');
    const dataStream = Readable.from(buffer);
    return await this.readCSVData(dataStream);
  }

  isValidDateFormat(dateString: string): boolean {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    return datePattern.test(dateString);
  }

  generateRandomString(length: number): string {
    const uuid = uuidv4().replace(/-/g, '');
    return uuid.substr(0, length);
  }

  getHeaderMap(headerMapping: string) {
    const keyValuePairs = headerMapping.split(',');
    const resultMap = new Map();
    keyValuePairs.forEach((pair) => {
      const [value, key] = pair.split(':');
      resultMap.set(key, value);
    });
    return resultMap;
  }

  getCurrentIstMomentDateTime() {
    return moment(new Date()).add(5, 'hours').add(30, 'minutes');
  }

  convertToNumber(value: any) {
    return value != null ? Number(value) : null;
  }
}
