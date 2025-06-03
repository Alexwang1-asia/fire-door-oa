import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const ExcelViewer = ({ fileUrl, fileName }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fileUrl) {
      loadExcelFile();
    }
  }, [fileUrl]);

  const loadExcelFile = async () => {
    try {
      setLoading(true);
      setError('');

      // 获取文件
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('文件加载失败');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 只解析第一个工作表
      if (workbook.SheetNames.length > 0) {
        parseFirstSheet(workbook);
      } else {
        setError('Excel文件中没有找到工作表');
      }
    } catch (err) {
      console.error('Excel解析错误:', err);
      setError('无法解析Excel文件，请确保文件格式正确');
    } finally {
      setLoading(false);
    }
  };

  const parseFirstSheet = (workbook) => {
    try {
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 将工作表转换为JSON数组
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '', // 空单元格默认值
        raw: false  // 保持格式化
      });

      if (jsonData.length === 0) {
        setError('表格数据为空');
        return;
      }

      // 处理数据，删除空列
      const processedData = removeEmptyColumns(jsonData);
      
      if (processedData.headers.length === 0) {
        setError('没有找到有效的数据列');
        return;
      }

      setHeaders(processedData.headers);
      setData(processedData.data);
    } catch (err) {
      console.error('工作表解析错误:', err);
      setError('工作表解析失败');
    }
  };

  const removeEmptyColumns = (rawData) => {
    if (rawData.length === 0) {
      return { headers: [], data: [] };
    }

    // 找到最大列数
    const maxCols = Math.max(...rawData.map(row => row.length));
    
    // 检查每一列是否为空
    const nonEmptyColumns = [];
    
    for (let colIndex = 0; colIndex < maxCols; colIndex++) {
      let hasData = false;
      
      // 检查这一列是否有非空数据
      for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
        const cellValue = rawData[rowIndex][colIndex];
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          hasData = true;
          break;
        }
      }
      
      if (hasData) {
        nonEmptyColumns.push(colIndex);
      }
    }

    // 如果没有找到非空列，返回空数据
    if (nonEmptyColumns.length === 0) {
      return { headers: [], data: [] };
    }

    // 提取非空列的数据
    const headers = nonEmptyColumns.map(colIndex => 
      rawData[0] && rawData[0][colIndex] ? rawData[0][colIndex] : `列${colIndex + 1}`
    );

    const dataRows = rawData.slice(1).map(row => 
      nonEmptyColumns.map(colIndex => row[colIndex] || '')
    ).filter(row => 
      // 过滤掉完全空白的行
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    return {
      headers,
      data: dataRows
    };
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "下料单");
    XLSX.writeFile(wb, fileName || '下料单.xlsx');
  };

  const copyToClipboard = async () => {
    try {
      // 将表格数据转换为制表符分隔的文本
      const headerText = headers.join('\t');
      const dataText = data.map(row => row.join('\t')).join('\n');
      const fullText = headerText + '\n' + dataText;
      
      await navigator.clipboard.writeText(fullText);
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed';
      toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi bi-check-circle me-2"></i>
            表格数据已复制到剪贴板
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      `;
      document.body.appendChild(toast);
      
      // 3秒后自动移除
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 3000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">加载中...</span>
        </div>
        <p className="mt-2 text-muted">正在解析Excel文件...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
        <div className="mt-2">
          <a 
            href={fileUrl} 
            className="btn btn-sm btn-outline-primary"
            download
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-download me-1"></i>
            直接下载文件
          </a>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        表格数据为空或没有有效的数据列
      </div>
    );
  }

  return (
    <div className="excel-viewer">
      {/* 操作按钮栏 */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="text-muted">
            <i className="bi bi-table me-1"></i>
            共 {data.length} 行数据，{headers.length} 列
          </span>
        </div>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-outline-info"
            onClick={copyToClipboard}
            title="复制表格数据"
          >
            <i className="bi bi-clipboard me-1"></i>
            复制数据
          </button>
          <button 
            className="btn btn-outline-success"
            onClick={exportToExcel}
            title="导出为Excel文件"
          >
            <i className="bi bi-download me-1"></i>
            导出Excel
          </button>
          <a 
            href={fileUrl} 
            className="btn btn-outline-primary"
            download
            target="_blank"
            rel="noreferrer"
            title="下载原始文件"
          >
            <i className="bi bi-file-earmark-arrow-down me-1"></i>
            原文件
          </a>
        </div>
      </div>

      {/* 表格显示 */}
      <div className="table-responsive excel-table-container">
        <table className="table table-striped table-hover table-sm">
          <thead className="table-dark sticky-top">
            <tr>
              <th width="50" className="text-center">#</th>
              {headers.map((header, index) => (
                <th key={index} style={{ minWidth: '120px' }}>
                  <div className="d-flex align-items-center">
                    <span className="me-1">{header || `列${index + 1}`}</span>
                    <small className="text-muted">({index + 1})</small>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="text-center text-muted fw-bold">
                  {rowIndex + 1}
                </td>
                {headers.map((_, colIndex) => {
                  const cellValue = row[colIndex] || '';
                  return (
                    <td key={colIndex}>
                      <div 
                        className="cell-content" 
                        title={cellValue}
                        style={{ 
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cellValue}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部信息 */}
      <div className="mt-3 d-flex justify-content-between align-items-center">
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          显示第一个工作表，已自动删除空列
        </small>
        <small className="text-muted">
          点击单元格可查看完整内容
        </small>
      </div>
    </div>
  );
};

export default ExcelViewer;