/**
 * Mock data cho VHL Interface.
 * Sau này chuyển sang fetch backend: thay getCarriages() và getNodes()
 * bằng fetch(API_URL + '/carriages') và fetch(API_URL + '/nodes') tương ứng.
 */

export const MOCK_NODES = [
  { node_name: 'VHL_Import1',   type: 'import', line: 1,   start: 40000352, end: 10000367, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Import2',   type: 'import', line: 2,   start: 40000351, end: 40000377, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Import3-1', type: 'import', line: 3.1, start: 40000366, end: 40000137, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Import3-2', type: 'import', line: 3.2, start: 40000366, end: 40000200, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Import4-2', type: 'import', line: 4.2, start: 40000366, end: 40000130, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Supply1',   type: 'supply', line: 1,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Supply2',   type: 'supply', line: 2,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Supply3-1', type: 'supply', line: 3.2, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Supply3-2', type: 'supply', line: 3.2, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Supply4-2', type: 'supply', line: 4.2, start: 40001423, end: 40000029, next_start: 40000027, next_end: 40000365 },
  { node_name: 'VHL_Return1',   type: 'return', line: 1,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Return2',   type: 'return', line: 2,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Return3-1', type: 'return', line: 3.1, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Return3-2', type: 'return', line: 3.2, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Return4-2', type: 'return', line: 4.2, start: 40001423, end: 40000029, next_start: 40000027, next_end: 40000365 },
  { node_name: 'VHL_Dual1',     type: 'dual',   line: 1,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Dual2',     type: 'dual',   line: 2,   start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Dual3-1',   type: 'dual',   line: 3.1, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Dual3-2',   type: 'dual',   line: 3.2, start: 10000658, end: 10000658, next_start: 10000658, next_end: 10000658 },
  { node_name: 'VHL_Dual4-2',   type: 'dual',   line: 4.2, start: 40001423, end: 40000029, next_start: 40000027, next_end: 40000365 },
]

export const LINES = [1, 2, 3.1, 3.2, 4.1, 4.2]

/** Lấy danh sách nodes – sau đổi thành fetch từ backend nếu có API nodes */
export function getNodes() {
  return Promise.resolve([...MOCK_NODES])
}
