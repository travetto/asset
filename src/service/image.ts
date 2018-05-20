import * as fs from 'fs';
import * as gm from 'gm';
import * as util from 'util';

import { Cacheable } from '@travetto/cache';
import { Injectable } from '@travetto/di';

import { AssetService } from './asset';
import { Asset, AssetMetadata } from '../model';
import { AssetUtil } from '../util';

const fsUnlinkAsync = util.promisify(fs.unlink);

@Injectable()
export class ImageService {

  constructor(private assetService: AssetService) { }

  @Cacheable({
    max: 1000,
    dispose: (key: string, n: string) => fsUnlinkAsync(n).catch(e => null)
  })
  async generateAndStoreImage(filename: string, options: { w: number, h: number }, filter?: AssetMetadata): Promise<string | undefined> {
    const info = await this.assetService.get(filename, filter);
    if (!info.stream) {
      throw new Error('Stream not found');
    }
    if (options && (options.w || options.h)) {
      const filePath = AssetUtil.generateTempFile(info.filename.split('.').pop() as string);
      const op = gm(info.stream, info.filename)
        .resize(options.w, options.h)
        .autoOrient();
      await util.promisify(op.write).call(op, filePath);
      return filePath;
    }
  }

  async getImage(filename: string, options: { w: number, h: number }, filter?: AssetMetadata): Promise<Asset> {
    const file = await this.generateAndStoreImage(filename, options, filter);
    const info = await this.assetService.get(filename, filter);
    if (file) {
      info.stream = fs.createReadStream(file);
      delete info.length;
    }
    return info;
  }
}