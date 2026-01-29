import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Grid3x3, User, Upload, Settings, Download } from 'lucide-react';
import GridPreview from './GridPreview';
import CellNameEditor from './CellNameEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useUsers } from '../../hooks/Users/useUsers';
import useNodesBySelectedUser from '../../hooks/Setting/useNodesBySelectedUser';
import useNodeSettingsLazy from '../../hooks/Setting/useNodeSettingsLazy';
import { useTranslation } from "react-i18next"; 

export default function PointSettings() {
    const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Grid Configuration */}
      <Card className="border-2 glass">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-white" />
                {t('settings.buttonSettings')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Dropdown Menu for quick select user */}
              <div className="flex items-center gap-2">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 glass">
                  <User className="h-4 w-4 glass" />
                  {selectedUser?.username || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" 
                className="w-64 glass" 
                style={{ 
                  backgroundColor: "rgba(139,92,246,0.25)", 
                  border: "1px solid rgba(255,255,255,0.25)" 
                  }}
                >
                <div className="px-2 py-1.5 text-sm font-semibold text-white">
                  {t('settings.selectUser')}
                </div>
                {usersLoading ? (
                  <div className="px-2 py-1.5 text-sm text-white">
                    {t('settings.loadingUserList')}
                  </div>
                ) : usersError ? (
                  <div className="px-2 py-1.5 text-sm text-red-500">
                    {t('settings.error', {error: usersError})}
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: users.length > 4 ? "200px" : "auto",
                      overflowY: users.length > 4 ? "auto" : "visible",
                      color: "white",
                      backgroundColor: "rgba(255,255,255,0.25)",
                      borderRadius: "8px"
                    }}
                  >
                    {users.map((user) => (
                      <DropdownMenuItem 
                        key={user.id}
                        onClick={() => handleUserSelect(user.id)}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-white" />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.is_superuser ? "Administrator" : "User"}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            </div>
          </div>
        </CardHeader>

        {/* Chu trình */}
        <CardContent className="space-y-6">
          {/* Line Selection */}
          <div className="space-y-2">
            <Label htmlFor="line" className="text-sm font-medium">
              Chọn Line *
            </Label>
            <Select 
              value={selectedLine || ""} 
              onValueChange={(value) => {
                setSelectedLine(value);
                setNewNodeData(prev => ({ ...prev, line: value }));
              }}
            >
              <SelectTrigger id="line" className="text-lg">
                <SelectValue placeholder="Chọn line">
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LINE_OPTIONS.map((lineOption) => (
                  <SelectItem key={lineOption} value={lineOption}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: LINE_COLORS[lineOption] }}
                      />
                      <span>{lineOption}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nodeType" className="text-sm font-medium">
              {t('settings.cycleMode')}
            </Label>
            <Select value={selectedNodeType} onValueChange={handleNodeTypeChange}>
              <SelectTrigger id="nodeType" className="text-lg">
                <SelectValue placeholder={t('settings.selectCycleMode')}>
                  {selectedNodeType ? nodeTypeMapping[selectedNodeType] || selectedNodeType : "Chọn chế độ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent 
                className="glass" 
                style={{ 
                backgroundColor: "rgba(139,92,246,0.25)", 
                // border: "1px solid rgba(255,255,255,0.25)" 
                }}>
                {Object.keys(nodeTypes).map((nodeType) => (
                  <SelectItem key={nodeType} value={nodeType}>
                    {nodeTypeMapping[nodeType] }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-3 flex-col">
              <Label className="text-sm font-medium">{t('settings.totalCells')}:</Label>
              <div className="text-4xl font-bold font-mono text-white">{totalCellsSelectedType}</div>
            </div>
            <div className="flex items-center gap-3 flex-col">
              <Label className="text-sm font-medium">{t('settings.createNew')}:</Label>
              <Button variant="ghost" size="icon" onClick={increaseCells}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Form thêm node mới */}
          {showAddForm && (
            <div className="pt-4 border-t">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">{t('settings.addNewNode')}</CardTitle>
                  <CardDescription className="text-blue-600">
                    {t('settings.enterInformationForNewNode')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {!selectedLine && (
                    <div className="space-y-2">
                      <Label htmlFor="nodeType" className="text-sm font-medium">
                        Line *
                      </Label>
                      <select
                        id="line"
                        value={newNodeData.line || ""}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, line: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Chọn Line...</option>
                        <option value="Line 1">Line 1</option>
                        <option value="Line 2">Line 2</option>
                        <option value="Line 3">Line 3</option>
                        <option value="Line 4">Line 4</option>
                        <option value="Line 5">Line 5</option>
                        <option value="Line 6">Line 6</option>
                        <option value="Line 7">Line 7</option>
                        <option value="Line 8">Line 8</option>
                        <option value="Line 9">Line 9</option>
                        <option value="Line 10">Line 10</option>
                      </select>
                    </div>
                  )}
                  {/* Chu trình - chỉ hiển thị khi chưa có selectedNodeType */}
                  {!selectedNodeType && (
                    <div className="space-y-2">
                      <Label htmlFor="nodeType" className="text-sm font-medium">
                        {t('settings.cycleMode')} *
                      </Label>
                      <select
                        id="nodeType"
                        value={newNodeData.nodeType || ""}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, nodeType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Chọn loại chu trình...</option>
                        <option value="supply">Cấp</option>
                        <option value="returns">Trả</option>
                        <option value="both">Cấp&Trả</option>
                        <option value="auto">Tự động</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 grid-rows-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="node_name" className="text-sm font-medium">
                        {t('settings.nodeName')} *
                      </Label>
                      <input
                        id="node_name"
                        type="text"
                        value={newNodeData.node_name}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, node_name: e.target.value }))}
                        placeholder="Nhập tên node..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="process_code" className="text-sm font-medium">
                        Process Name
                      </Label>
                      <input
                        id="process_code"
                        type="text"
                        value={newNodeData.process_code}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, process_code: e.target.value }))}
                        placeholder="Nhập process_code (tùy chọn)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2  row-start-2">
                      <Label htmlFor="start" className="text-sm font-medium">
                        {t('settings.start')} *
                      </Label>
                      <input
                        id="start"
                        type="number"
                        value={newNodeData.start}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, start: parseInt(e.target.value) || null }))}
                        placeholder={t('settings.enterStartValue')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 row-start-2">
                      <Label htmlFor="end" className="text-sm font-medium">
                        {t('settings.end')} *
                      </Label>
                      <input
                        id="end"
                        type="number"
                        value={newNodeData.end}
                        onChange={(e) => setNewNodeData(prev => ({ ...prev, end: parseInt(e.target.value) || null }))}
                        placeholder={t('settings.enterEndValue')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {(selectedNodeType === 'both' ||newNodeData.nodeType === 'both') && (
                      <>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_start" className="text-sm font-medium">
                            {t('settings.nextStart')} (Tùy chọn)
                          </Label>
                          <input
                            id="next_start"
                            type="number"
                            value={newNodeData.next_start}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_start: parseInt(e.target.value) || null }))}
                            placeholder={t('settings.enterNextStartValue')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-2 row-start-3">
                          <Label htmlFor="next_end" className="text-sm font-medium">
                            {t('settings.nextEnd')} (Tùy chọn)
                          </Label>
                          <input
                            id="next_end"
                            type="number"
                            value={newNodeData.next_end}
                            onChange={(e) => setNewNodeData(prev => ({ ...prev, next_end: parseInt(e.target.value) || null }))}
                            placeholder={t('settings.enterNextEndValue')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setNewNodeData({
                          node_name: "",
                          nodeType: "",
                          line: "",
                          process_code: "",
                          start: 0,
                          end: 0,
                          next_start: 0,
                          next_end: 0
                        });
                      }}
                    >
                      {t('settings.cancel')}
                    </Button>
                    <Button 
                      onClick={handleConfirmAddNode}
                      disabled={(!newNodeData.line && !selectedLine) || !newNodeData.node_name || !newNodeData.process_code || !newNodeData.start || !newNodeData.end || (!selectedNodeType && !newNodeData.nodeType)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {t('settings.confirm')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <GridPreview columns={columnsWantToShow} cells={dataFilteredByNodes} onDeleteCell={handleDeleteCell} selectedNodeType={selectedNodeType} />
          </div>
        </CardContent>
      </Card>
      {/*Cell Name Configuration */}
      <Card className="border-2 glass">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('settings.cellNameEditor')}</CardTitle>
            </div>
            <div className="flex flex-col items-end gap-2">
              <input
                id="excel-import"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
              <div className="flex flex-row items-end gap-2">
              {/* Nút Export Excel */}
              <Button
              className="glass"
                onClick={handleExportData}
                size="sm"
                title={data && data.length > 0 ? t('settings.exportCurrentData') : t('settings.downloadTemplate')}
              >
                <Download className="h-4 w-4 mr-2 glass" />
                {data && data.length > 0 ? t('settings.exportExcel') : t('settings.downloadExcelTemplate')}
              </Button>

              {/* Nút Import Excel */}
              {(() => {
                if (!selectedUser?.id) {
                  return (
                    <div className="relative inline-block group">
                      <Button
                        className="glass"
                        disabled
                        onClick={() => {}}
                        size="sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t('settings.importExcel')}
                      </Button>
                      <div className="pointer-events-none absolute -top-8 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100 border shadow-sm">
                        {t('settings.selectUserBeforeImportExcel')}
                      </div>
                    </div>
                  );
                }
                return (
                  <Button
                    className="glass"
                    onClick={() => document.getElementById('excel-import').click()}
                    size="sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('settings.importExcel')}
                  </Button>
                );
              })()}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Format: node_name, node_type, line, process_code, start, end, next_start, next_end
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-white">
          <CellNameEditor 
            cells={dataFilteredByNodes} 
            handleUpdateBatch={handleUpdateBatch} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
