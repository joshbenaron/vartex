// import camelcaseKeys from 'camelcase-keys';
import * as R from 'rambda';
import { Request, Response } from 'express';
import {
  blockMapper,
  blockHeightToHashMapper,
  poaMapper,
} from '../database/mapper.database';

export async function blockByHeightRoute(
  req: Request,
  res: Response,
  next: (err?: string) => void
) {
  if (!req.params.height) {
    res.status(503);
    return next('Height value was not specified');
  } else {
    try {
      const height = req.params.height;
      const { block_hash } = await blockHeightToHashMapper.get({
        block_height: height,
      });
      const poa = await poaMapper.get({ block_hash, block_height: height });
      // console.error(poa, { block_hash, block_height: height });
      R.pipe(
        R.assoc('poa', poa),
        R.dissoc('poa.block_hash'),
        R.dissoc('poa.block_height'),
        (ret) => res.json(ret)
      )(await blockMapper.get({ height, indep_hash: block_hash }));
    } catch (error) {
      // Passes errors into the error handler
      return next(error);
    }
  }
}
