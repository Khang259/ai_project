import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useTranslation } from "react-i18next";
import { Video, Plus, Trash2, Edit2, FileSpreadsheet, ArrowRight, AlertCircle } from 'lucide-react';
import api from '@/services/api';

export default function PointSettings() {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pairs, setPairs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPair, setEditingPair] = useState(null);
    const [error, setError] = useState("");

    const loadData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/points');
            if (Array.isArray(response.data)) {
                setPairs(response.data);
            }
        } catch (err) {
            console.error("Load Error:", err);
            setError(t("Failed to load points from server."));
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);

    const validate = (load, unload, currentId) => {
        const l = load.trim().toLowerCase();
        const u = unload.trim().toLowerCase();
        if (l === u) return t("Load and Unload points cannot be the same.");

        const isDup = pairs.some(p => p.id !== currentId &&
            p.loadName.toLowerCase() === l && p.unloadName.toLowerCase() === u);
        if (isDup) return t("This pair already exists.");

        return null;
    };
    const handleSave = async (e) => {
        e.preventDefault();
        setError("");
        const formData = new FormData(e.target);
        const load = formData.get("loadName");
        const unload = formData.get("unloadName");

        const validationError = validate(load, unload, editingPair?.id);
        if (validationError) {
            setError(validationError);
            return;
        }

        const pairData = {
            loadName: load.trim(),
            unloadName: unload.trim(),
            area: formData.get("area"),
        };

        try {
            if (editingPair) {
                await api.put(`/points/${editingPair.id}`, pairData);
            } else {
                await api.post(`/points`, pairData);
            }

            const response = await api.get(`/points`);
            if (Array.isArray(response.data)) {
                setPairs(response.data);
            }

            closeModal();
        } catch (err) {
            console.error("API Error:", err);
            setError(t("Failed to save data. Please check your connection."));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t("Delete this pair?"))) {
            try {
                await api.delete(`/points/${id}`);
                setPairs(pairs.filter(p => p.id !== id));
            } catch (err) {
                setError(t("Could not delete item."));
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPair(null);
        setError("");
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                Load: "Example Load Point",
                Unload: "Example Unload Point",
                Area: "Example Area"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // 3. Generate the file and trigger download
        XLSX.writeFile(wb, "Points_Import_Template.xlsx");
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const imported = XLSX.utils.sheet_to_json(ws);
                const validData = imported
                    .filter(row => {
                        const l = (row.Load || "").toString().trim();
                        const u = (row.Unload || "").toString().trim();
                        // Ensure points are not empty and not identical
                        return l && u && l.toLowerCase() !== u.toLowerCase();
                    })
                    .map(row => ({
                        loadName: row.Load.toString().trim(),
                        unloadName: row.Unload.toString().trim(),
                        area: (row.Area || "").toString().trim(),
                    }));

                if (validData.length === 0) {
                    setError(t("No valid pairs found in the Excel file."));
                    return;
                }
                await api.post('/points/bulk', validData);
                await loadData();
                e.target.value = null;

            } catch (err) {
                console.error("Import Error:", err);
                setError(t("Failed to import Excel data. Check console for details."));
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6 text-white">
            <Card className="border-2 glass bg-gray-900/40">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Video className="h-5 w-5" />
                            {t('Points Management')}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            {t('Manage your load-unload pairs here')}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-gray-600 text-xs transition text-gray-300"
                        >
                            <FileSpreadsheet className="h-4 w-4" /> {t('Download Template')}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.csv" />
                        <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-gray-600 text-xs transition">
                            <FileSpreadsheet className="h-4 w-4" /> {t('Import')}
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs transition">
                            <Plus className="h-4 w-4" /> {t('Add Pair')}
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400">
                                    <th className="p-3 text-left">{t('Load Point')}</th>
                                    <th className="p-3"></th>
                                    <th className="p-3 text-left">{t('Unload Point')}</th>
                                    <th className="p-3 text-left">{t('Area')}</th>
                                    <th className="p-3 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pairs.map((pair) => (
                                    <tr key={pair.id} className="border-b border-gray-800/50 hover:bg-white/5 transition">
                                        <td className="p-3 font-medium text-white">{pair.loadName}</td>
                                        <td className="p-3 text-center"><ArrowRight className="h-4 w-4 text-gray-500" /></td>
                                        <td className="p-3 font-medium text-white">{pair.unloadName}</td>
                                        <td className="p-3 text-gray-400">{pair.area}</td>
                                        <td className="p-3 text-right space-x-2">
                                            <button onClick={() => { setEditingPair(pair); setIsModalOpen(true); }} className="p-1 hover:text-blue-400 transition"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(pair.id)} className="p-1 hover:text-red-400 transition"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal - Styled to match gray-ish background */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border-2 border-gray-700 p-6 rounded-lg w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-white">{editingPair ? t('Edit Pair') : t('Add New Pair')}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && <div className="p-2 bg-red-900/30 border border-red-500 text-red-200 text-xs rounded flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">{t('Load Point')}</label>
                                    <input name="loadName" defaultValue={editingPair?.loadName} required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold">{t('Unload Point')}</label>
                                    <input name="unloadName" defaultValue={editingPair?.unloadName} required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold">{t('Area')}</label>
                                <input name="area" defaultValue={editingPair?.area} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="text-xs text-gray-400 hover:text-white transition">{t('Cancel')}</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded transition font-bold">{t('Save Pair')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}