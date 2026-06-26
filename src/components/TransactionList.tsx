import React, { useState, useMemo } from "react";
import { 
  FileDown, 
  Trash2, 
  Edit, 
  Search, 
  Calendar, 
  Trash, 
  ClipboardList,
  Image as ImageIcon
} from "lucide-react";
import { Transaction, Place } from "../types";
import ConfirmModal from "./ConfirmModal";
import AlertModal from "./AlertModal";

interface TransactionListProps {
  place: Place;
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (txId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export default function TransactionList({
  place,
  transactions,
  onEdit,
  onDelete,
  onClearAll,
}: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("All"); // format: yyyy-mm

  // Custom Modal States for Senior Usability & Sandboxed safety
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "info" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  
  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setMonthFilter("All");
  };

  // Get list of unique months in transactions for filter dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    safeTxs.forEach((tx) => {
      if (tx && tx.date && tx.date.length >= 7) {
        months.add(tx.date.substring(0, 7)); // yyyy-mm
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filter & sort transactions
  const filteredTransactions = useMemo(() => {
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    let list = [...safeTxs];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((tx) => 
        tx && (
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (tx.amount !== undefined && tx.amount.toString().includes(q))
        )
      );
    }

    // Month filter
    if (monthFilter !== "All") {
      list = list.filter((tx) => tx && tx.date && tx.date.startsWith(monthFilter));
    }

    // Sort by date descending, then by creation date descending
    return list.sort((a, b) => {
      const aDate = a?.date || "";
      const bDate = b?.date || "";
      const dateCompare = bDate.localeCompare(aDate);
      if (dateCompare !== 0) return dateCompare;
      const aCreated = a?.createdAt || "";
      const bCreated = b?.createdAt || "";
      return bCreated.localeCompare(aCreated);
    });
  }, [transactions, search, monthFilter]);

  // Compute total of filtered transactions
  const filteredTotal = useMemo(() => {
    const safeFiltered = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    return safeFiltered.reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0);
  }, [filteredTransactions]);

  // Format month name for display
  const formatMonthLabel = (yearMonth: string) => {
    if (yearMonth === "All") return "All Months";
    try {
      const [year, month] = yearMonth.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } catch (e) {
      return yearMonth;
    }
  };

  // Format date for simple list
  const getFormattedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    } catch (e) {
      return dateStr;
    }
  };

  // Export ledger to PDF
  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const safeName = place.placeName.replace(/[^a-zA-Z0-9]/g, "_");
      
      // Header Section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(24, 24, 27); // zinc-900 / charcoal
      doc.text("LEDGER REPORT", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(113, 113, 122); // zinc-500
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}`, 14, 26);
      
      // Divider line
      doc.setDrawColor(228, 228, 231); // zinc-200
      doc.setLineWidth(0.5);
      doc.line(14, 30, 196, 30);
      
      // Site/Place info
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(24, 24, 27);
      doc.text(`Work Place: ${place.placeName}`, 14, 38);

      // Summary block in PDF
      const summaryY = 46;
      doc.setFillColor(244, 244, 245); // zinc-100
      doc.rect(14, summaryY, 182, 16, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(82, 82, 91); // zinc-600
      doc.text("TOTAL AMOUNT:", 20, summaryY + 10);
      doc.text(`Rs. ${filteredTotal.toLocaleString("en-IN")}`, 60, summaryY + 10);
      doc.text(`ENTRIES: ${filteredTransactions.length}`, 140, summaryY + 10);

      // Entries Table Header
      const tableHeaderY = summaryY + 24;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.setFillColor(228, 228, 231); // zinc-200
      doc.rect(14, tableHeaderY, 182, 8, "F");
      
      doc.text("DATE", 18, tableHeaderY + 6);
      doc.text("NOTE / DETAILS", 50, tableHeaderY + 6);
      doc.text("AMOUNT", 170, tableHeaderY + 6);

      // Render Entries Rows
      let currentY = tableHeaderY + 8;
      const rowHeight = 8;
      const pageHeight = doc.internal.pageSize.height;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(24, 24, 27);

      filteredTransactions.forEach((tx, idx) => {
        // Page break check
        if (currentY + rowHeight > pageHeight - 15) {
          doc.addPage();
          currentY = 20;
          // Redraw header on new page
          doc.setFont("Helvetica", "bold");
          doc.setFillColor(228, 228, 231);
          doc.rect(14, currentY, 182, 8, "F");
          doc.text("DATE", 18, currentY + 6);
          doc.text("NOTE / DETAILS", 50, currentY + 6);
          doc.text("AMOUNT", 170, currentY + 6);
          doc.setFont("Helvetica", "normal");
          currentY += 8;
        }

        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(14, currentY, 182, rowHeight, "F");
        }

        // Draw Row Border bottom
        doc.setDrawColor(244, 244, 245);
        doc.line(14, currentY + rowHeight, 196, currentY + rowHeight);

        // Date
        const formattedDate = getFormattedDate(tx.date);
        doc.text(formattedDate, 18, currentY + 5);

        // Note
        const noteText = tx.note || "No note entered";
        const clippedNote = noteText.length > 55 ? noteText.substring(0, 52) + "..." : noteText;
        doc.text(clippedNote, 50, currentY + 5);

        // Amount
        const amountText = `Rs. ${tx.amount.toLocaleString("en-IN")}`;
        doc.text(amountText, 170, currentY + 5);

        currentY += rowHeight;
      });

      // Footer notice
      doc.setFontSize(8);
      doc.setTextColor(161, 161, 170); // zinc-400
      doc.text("Mason Site Ledger - Handcrafted Offline-First Khata", 14, pageHeight - 10);

      doc.save(`${safeName}_Ledger_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      setAlertConfig({
        isOpen: true,
        title: "Export Failed",
        message: "Failed to export PDF report. Please try again.",
        type: "error"
      });
    }
  };

  // Export ledger to high-contrast sharing JPG for WhatsApp/Seniors
  const handleExportJPG = async () => {
    try {
      const { default: html2canvas } = await import("html2canvas");
      // Create off-screen clean receipt container
      const element = document.createElement("div");
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.top = "-9999px";
      element.style.width = "420px";
      element.style.backgroundColor = "#ffffff";
      element.style.color = "#18181b";
      element.style.padding = "24px";
      element.style.borderRadius = "16px";
      element.style.border = "3px solid #18181b";
      element.style.fontFamily = "system-ui, -apple-system, sans-serif";

      let content = `
        <div style="border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 16px; text-align: center;">
          <p style="font-size: 11px; font-weight: 900; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">Work Site Ledger</p>
          <h2 style="font-size: 24px; font-weight: 900; color: #18181b; margin: 0; text-transform: uppercase; line-height: 1.2;">${place.placeName}</h2>
          <p style="font-size: 11px; color: #71717a; margin: 6px 0 0 0; font-weight: 500;">Date: ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        
        <div style="background-color: #f4f4f5; padding: 16px; border-radius: 12px; border: 2px solid #18181b; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; font-weight: 900; color: #52525b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">Total Khata Amount</span>
          <span style="font-size: 36px; font-weight: 900; color: #18181b; font-family: monospace; display: block; line-height: 1;">₹${filteredTotal.toLocaleString("en-IN")}</span>
          <span style="font-size: 12px; color: #71717a; display: block; margin-top: 6px; font-weight: 700;">Showing ${filteredTransactions.length} entries</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h3 style="font-size: 12px; font-weight: 900; color: #18181b; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 2px solid #18181b; padding-bottom: 4px;">Ledger List</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
      `;

      filteredTransactions.forEach((tx) => {
        const dateStr = getFormattedDate(tx.date);
        const noteStr = tx.note || "No note entered";
        content += `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1px solid #e4e4e7; font-size: 13px;">
            <div style="max-width: 70%; padding-right: 12px;">
              <span style="font-size: 10px; font-weight: 800; color: #71717a; font-family: monospace; display: block; margin-bottom: 2px;">${dateStr}</span>
              <span style="font-weight: 700; color: #18181b; word-break: break-all; display: block; line-height: 1.3;">${noteStr}</span>
            </div>
            <div style="text-align: right; font-weight: 900; font-family: monospace; color: #18181b; font-size: 14px; white-space: nowrap;">
              ₹${tx.amount.toLocaleString("en-IN")}
            </div>
          </div>
        `;
      });

      if (filteredTransactions.length === 0) {
        content += `
          <div style="padding: 24px 0; text-align: center; color: #71717a; font-size: 13px; font-style: italic; font-weight: bold;">
            No entries to show.
          </div>
        `;
      }

      content += `
          </div>
        </div>
        
        <div style="text-align: center; border-top: 2px dashed #e4e4e7; padding-top: 14px; margin-top: 10px; font-size: 10px; color: #71717a; font-weight: 700;">
          * Handcrafted Digital Khata - Thank You! *
        </div>
      `;

      element.innerHTML = content;
      document.body.appendChild(element);

      // Wait a tiny bit to make sure styles render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2.5, // Crisp high-definition text
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(element);

      // Download the clean image
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const safeName = place.placeName.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${safeName}_Ledger_Photo_${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to export JPG image", e);
      setAlertConfig({
        isOpen: true,
        title: "Export Failed",
        message: "Failed to save the photo. Please try again.",
        type: "error"
      });
    }
  };

  const handleClearAllConfirm = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete All Entries?",
      message: `Are you sure you want to permanently delete ALL ${transactions.length} entries for "${place.placeName}"?\n\nThis cannot be undone!`,
      confirmText: "Yes, Delete All",
      cancelText: "No, Keep Them",
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        await onClearAll();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Month Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30 focus:bg-white"
            />
          </div>

          {/* Month Selector Dropdown */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="All">All Months</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar (Export, Clear, Reset Filters) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {(search || monthFilter !== "All") && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-300 px-2 py-1 rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportJPG}
              className="px-3.5 py-2 bg-royal-green-light text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Save ledger statement as photo for sharing on WhatsApp"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              Download Photo (JPG)
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-royal-green text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download high-resolution PDF ledger report"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              Download PDF
            </button>

            {transactions.length > 0 && (
              <button
                onClick={handleClearAllConfirm}
                className="p-2 text-red-600 bg-red-50 border border-red-100 rounded-xl cursor-pointer"
                title="Delete all entries"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Summary / Total Count Bar */}
      <div className="bg-gray-100 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-gray-700">
        <div>
          Showing {filteredTransactions.length} of {transactions.length} entries
        </div>
        <div className="text-royal-green text-sm font-black">
          Total: ₹{filteredTotal.toLocaleString("en-IN")}
        </div>
      </div>

      {/* List / Table of Ledger Entries */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 space-y-2">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium">No ledger entries found.</p>
            <p className="text-xs text-gray-400">Add a new entry or adjust your filters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((tx) => (
              <div 
                key={tx.transactionId}
                className="p-4 flex items-center justify-between gap-3"
              >
                {/* Left Side: Date & Note */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500 font-mono">
                      {getFormattedDate(tx.date)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {tx.note || <span className="text-gray-400 italic">No note entered</span>}
                  </p>
                </div>

                {/* Right Side: Amount & CRUD actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-extrabold text-royal-green font-mono">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </span>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-lg text-gray-700 bg-gray-50 border border-gray-200 cursor-pointer"
                      title="Edit this entry"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: "Delete Entry?",
                          message: `Are you sure you want to delete this entry of ₹${tx.amount.toLocaleString("en-IN")} on ${getFormattedDate(tx.date)}?\n\n"${tx.note || "No note"}"`,
                          confirmText: "Yes, Delete",
                          cancelText: "Cancel",
                          onConfirm: async () => {
                            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            await onDelete(tx.transactionId);
                          }
                        });
                      }}
                      className="p-1.5 rounded-lg text-red-600 bg-red-50 border border-red-100 cursor-pointer"
                      title="Delete this entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Elderly-friendly Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Elderly-friendly Custom Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
