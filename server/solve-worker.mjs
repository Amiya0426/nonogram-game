// 唯一解校验 Worker：在独立线程中运行 countSolutions，避免阻塞主事件循环
import { parentPort, workerData } from 'node:worker_threads';
import { countSolutions } from './puzzle-lib.js';

const { puzzle, options } = workerData;
try {
  parentPort.postMessage(countSolutions(puzzle, options));
} catch (err) {
  parentPort.postMessage({ count: 0, timeout: true, error: String(err) });
}
