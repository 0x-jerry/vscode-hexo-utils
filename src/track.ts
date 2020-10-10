import ua from 'universal-analytics';
import getMAC from 'getmac';

const uid = getMAC();

export const visitor = ua('UA-101492756-3', uid, { strictCidFormat: false });
