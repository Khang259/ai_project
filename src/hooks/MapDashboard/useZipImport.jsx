import { useState, useCallback } from 'react';
import JSZip from 'jszip';

const useZipImport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zipFileName, setZipFileName] = useState('');

  // Helper function to convert array format to object format (same as useFileImport)
  const convertMapData = (jsonData) => {
    if (!jsonData.nodeKeys || !jsonData.lineKeys || !jsonData.nodeArr) {
      throw new Error('Invalid map file format. Missing required fields: nodeKeys, lineKeys, or nodeArr');
    }

    // Convert nodeArr from array of arrays to array of objects
    const convertedNodeArr = jsonData.nodeArr.map(nodeArray => {
      if (!Array.isArray(nodeArray) || nodeArray.length < 4) {
        console.warn('Invalid node array:', nodeArray);
        return null;
      }
      
      return {
        x: nodeArray[0], // x coordinate
        y: nodeArray[1], // y coordinate
        type: nodeArray[2], // type
        content: nodeArray[3], // content
        key: nodeArray[3], // use content as key for compatibility
        name: nodeArray[4] || nodeArray[3], // name or content
        isTurn: nodeArray[5] || 0,
        shelfIsTurn: nodeArray[6] || 0,
        extraTypes: nodeArray[7] || []
      };
    }).filter(node => node !== null);

    // Convert lineArr from array of arrays to array of objects
    const convertedLineArr = jsonData.lineArr.map(lineArray => {
      if (!Array.isArray(lineArray) || lineArray.length < 2) {
        console.warn('Invalid line array:', lineArray);
        return null;
      }
      
      return {
        startNode: lineArray[0], // from
        endNode: lineArray[1], // to
        leftWidth: lineArray[2] || 0,
        rightWidth: lineArray[3] || 0,
        startExpandDistance: lineArray[4] || 0,
        endExpandDistance: lineArray[5] || 0,
        path: lineArray[6] || []
      };
    }).filter(line => line !== null);

    return {
      ...jsonData,
      nodeArr: convertedNodeArr,
      lineArr: convertedLineArr
    };
  };

  const handleZipImport = useCallback((file, setMapData, setSecurityConfig, setSelectedAvoidanceMode) => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const zip = new JSZip();
    
    zip.loadAsync(file)
      .then((zipContent) => {
        // Tìm file compress.json trong folder compress
        const compressFile = zipContent.file('compress/compress.json') || 
                           zipContent.file('compress.json') ||
                           zipContent.file('compress/compress.json');
        
        if (!compressFile) {
          throw new Error('Không tìm thấy file compress.json trong ZIP file');
        }

        return compressFile.async('string');
      })
      .then((compressContent) => {
        try {
          const jsonData = JSON.parse(compressContent);
          
          // Kiểm tra xem đây có phải là map data hay security data
          if (jsonData.nodeKeys && jsonData.lineKeys && jsonData.nodeArr) {
            // Đây là map data
            const convertedData = convertMapData(jsonData);
            setMapData(convertedData);
            // Lưu vào localStorage
            localStorage.setItem('mapData', JSON.stringify(convertedData));
            localStorage.setItem('mapFileName', file.name);
            console.log('✅ Đã import map data từ ZIP file');
          } else if (jsonData.AvoidSceneSet) {
            // Đây là security data
            setSecurityConfig(jsonData);
            // Lưu vào localStorage
            localStorage.setItem('securityData', JSON.stringify(jsonData));
            localStorage.setItem('securityFileName', file.name);
            if (jsonData.AvoidSceneSet.length > 0) {
              setSelectedAvoidanceMode(jsonData.AvoidSceneSet[0].id);
            }
            console.log('✅ Đã import security data từ ZIP file');
          } else {
            throw new Error('File compress.json không có định dạng hợp lệ (không phải map data hay security data)');
          }
          
          setZipFileName(file.name);
        } catch (parseError) {
          throw new Error(`Lỗi parse JSON: ${parseError.message}`);
        }
      })
      .catch((error) => {
        setError(`Lỗi xử lý ZIP file: ${error.message}`);
        console.error('ZIP import error:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return {
    loading,
    error,
    zipFileName,
    handleZipImport
  };
};

export default useZipImport; 