import ua from 'universal-analytics';
import getMAC from 'getmac';

const uid = getMAC();

export const visitor = ua('UA-140135760-1', uid);
