"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import "./perm.css";
import "./perm-side.css";
import "./formula-equation.css";
import "./minimal-brand.css";
import "./service-photos.css";
import "./mobile.css";
import "./hair-damage.css";
import "./dye-selection.css";
import importedNotes from "./imported-notes.json";
import dyeCatalog from "./dye-catalog.json";
import permLotions from "./perm-lotions.json";

type Customer = { name: string; date: string; note: string; service: "染髮" | "燙髮" | "燙染" | "待整理"; raw: string; visits: number; amount?: number };
type ParsedFormula = { ingredients: string[]; ratios: string; grams: number[]; note?: string };
type ServiceRecord = { date: string; displayDate: string; needsReview: boolean; details: string[]; formulas: ParsedFormula[] };
type ManualCustomerRecord = { id: string; customerName: string; serviceDate: string; serviceType: string; details: string; sourceKey: string | null };
type EditableServiceRecord = ServiceRecord & { id?: string; sourceKey: string; serviceType: string; editorText: string };
type RecordDraft = { id?: string; sourceKey?: string | null; customerName: string; serviceDate: string; serviceType: string; details: string; structured?: boolean; dyeFormula?: string; dyeRatio?: string; dyeTotal?: string; developer?: string; developerRatio?: string; additive?: string; additiveRatio?: string; permLotion?: string; softening?: string; rods?: string; operation?: string; result?: string; correctionExpected?: string; correctionActual?: string; correctionCause?: string; correctionNext?: string; correctionAlert?: string };
type DamageSegment = { label: string; cm: number; level: number };
const defaultDamage: DamageSegment[] = [{ label: "新生髮", cm: 8, level: 0 }, { label: "髮中", cm: 12, level: 2 }, { label: "髮尾", cm: 10, level: 3 }];
type HairConditionType = "2段髮" | "3段髮" | "原生髮";
const conditionDefaults: Record<HairConditionType, DamageSegment[]> = {
  "2段髮": [{ label: "新生髮", cm: 8, level: 0 }, { label: "既染髮", cm: 20, level: 2 }],
  "3段髮": defaultDamage,
  "原生髮": [{ label: "原生髮", cm: 30, level: 0 }],
};
const hairColorLevels = Array.from({ length: 15 }, (_, index) => `${index + 5}-${index + 6}度`);

const excludedTitles = /^(沐浴染|洗色$|染劑使用量|攪色配方|髮根$|以下為|日系|既然要具體|資產配置|Hpv|代辦事項|7石榴紅\+|2024\.2\.9)/i;
const dateMatches = (text: string) => [...text.matchAll(/(?:20|29)\d{2}[./]\d{1,2}(?:[./]\d{1,2})?/g)].map((m) => m[0].replaceAll(".", "/"));
const normalizeName = (name: string) => name.replace(/\s+\d{9,10}$/, "").trim();
const dateLine = /^((?:20|29)\d{2})[./](\d{1,2})(?:[./](\d{1,2})?)?\s*(.*)$/;

function dateValue(value: string) {
  const match = value.match(dateLine);
  if (!match) return 0;
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3] || 0);
}

function formatServiceDate(value: string) {
  const match = value.match(dateLine);
  if (!match) return { displayDate: "日期未記錄", needsReview: true };
  const [, year, month, day] = match;
  const needsReview = year.startsWith("29") || !day;
  const displayDate = day
    ? `${year} 年 ${month.padStart(2, "0")} 月 ${day.padStart(2, "0")} 日`
    : `${year} 年 ${month.padStart(2, "0")} 月（日期未填）`;
  return { displayDate, needsReview };
}

function parseServiceRecords(customer: Customer): ServiceRecord[] {
  const lines = customer.raw.split("\n").map((line) => line.trim()).filter((line) => line && line !== customer.name && !line.startsWith("────"));
  const groups: { date: string; lines: string[] }[] = [];
  let current = { date: "", lines: [] as string[] };
  for (const line of lines) {
    const match = line.match(dateLine);
    if (match) {
      if (current.date || current.lines.length) groups.push(current);
      const normalizedDate = `${match[1]}/${match[2]}${match[3] !== undefined ? `/${match[3]}` : ""}`;
      current = { date: normalizedDate, lines: match[4]?.trim() ? [match[4].trim()] : [] };
    } else current.lines.push(line);
  }
  if (current.date || current.lines.length) groups.push(current);
  const parsed = groups.map((group) => {
    const formulas: ParsedFormula[] = [];
    const used = new Set<number>();
    for (let i = 0; i < group.lines.length - 2; i++) {
      const ingredients = group.lines[i];
      const ratios = group.lines[i + 1];
      const grams = group.lines[i + 2];
      if (!ingredients.includes("+") || !/[：:]/.test(ratios) || !/^\(?[\d.]+(?:\s*\+\s*[\d.]+)+/.test(grams)) continue;
      const ingredientList = ingredients.replace(/[（）()]/g, "").split("+").map((x) => x.trim()).filter(Boolean);
      const gramList = (grams.match(/[\d.]+/g) || []).map(Number).filter((n) => Number.isFinite(n));
      if (ingredientList.length < 2 || gramList.length < 2) continue;
      formulas.push({ ingredients: ingredientList, ratios, grams: gramList.slice(0, ingredientList.length) });
      used.add(i); used.add(i + 1); used.add(i + 2);
      i += 2;
    }
    if (!formulas.length) {
      const dyeIndex = group.lines.findIndex((line) => line.startsWith("染劑："));
      const ratioIndex = group.lines.findIndex((line) => line.startsWith("染劑比例："));
      const developerIndex = group.lines.findIndex((line) => line.startsWith("雙氧："));
      const additiveIndex = group.lines.findIndex((line) => line.startsWith("加強色："));
      if (dyeIndex >= 0 && developerIndex >= 0) {
        const dyeParts = group.lines[dyeIndex].replace(/^染劑：/, "").split(/[＋+]/).map((part) => part.trim()).filter(Boolean);
        const ingredients = dyeParts.map((part) => part.replace(/\s+[\d.]+g.*$/, "").trim());
        const grams = dyeParts.map((part) => Number(part.match(/([\d.]+)g/)?.[1] || 0));
        ingredients.push(group.lines[developerIndex].match(/^雙氧：([^\s]+)/)?.[1] || "雙氧");
        grams.push(Number(group.lines[developerIndex].match(/([\d.]+)g/)?.[1] || 0));
        const dyeRatios = group.lines[ratioIndex]?.replace(/^染劑比例：/, "").trim() || ingredients.slice(0, -1).map(() => "1").join(":");
        const developerRatioText = group.lines[developerIndex].match(/・1:([\d.]+)/)?.[1] || "1";
        let ratios = `${dyeRatios}+${developerRatioText}`;
        if (additiveIndex >= 0) {
          ingredients.push(group.lines[additiveIndex].match(/^加強色：([^\s]+)/)?.[1] || "加強色");
          grams.push(Number(group.lines[additiveIndex].match(/([\d.]+)g/)?.[1] || 0));
          ratios += `+${group.lines[additiveIndex].match(/1\/(\d+)/)?.[0] || "—"}`;
        }
        formulas.push({ ingredients, ratios, grams });
        [dyeIndex, ratioIndex, developerIndex, additiveIndex].filter((index) => index >= 0).forEach((index) => used.add(index));
      }
    }
    const dateText = group.date || "日期未記錄";
    const formatted = formatServiceDate(dateText);
    return { date: dateText, ...formatted, formulas, details: group.lines.filter((_, index) => !used.has(index)) };
  });
  const merged = new Map<string, ServiceRecord>();
  for (const record of parsed) {
    const key = record.date.replace(/\s.*$/, "") || "日期未記錄";
    const existing = merged.get(key);
    if (!existing) merged.set(key, record);
    else {
      existing.details = [...new Set([...existing.details, ...record.details])];
      const signatures = new Set(existing.formulas.map((formula) => `${formula.ingredients.join("+")}|${formula.ratios}|${formula.grams.join("+")}`));
      for (const formula of record.formulas) {
        const signature = `${formula.ingredients.join("+")}|${formula.ratios}|${formula.grams.join("+")}`;
        if (!signatures.has(signature)) existing.formulas.push(formula);
      }
    }
  }
  return [...merged.values()].sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

function serializeServiceRecord(record: ServiceRecord) {
  const formulaLines = record.formulas.flatMap((formula) => [formula.ingredients.join(" + "), formula.ratios, formula.grams.map((grams) => `${grams}g`).join(" + ")]);
  return [...formulaLines, ...record.details].join("\n");
}

function manualToEditable(record: ManualCustomerRecord): EditableServiceRecord {
  const synthetic: Customer = { name: record.customerName, date: record.serviceDate, note: record.details, service: (record.serviceType as Customer["service"]) || "待整理", raw: `${record.customerName}\n${record.serviceDate.replaceAll("-", "/")}\n${record.details}`, visits: 1 };
  const parsed = parseServiceRecords(synthetic)[0];
  return { ...(parsed || { date: record.serviceDate.replaceAll("-", "/"), ...formatServiceDate(record.serviceDate.replaceAll("-", "/")), details: record.details.split("\n"), formulas: [] }), id: record.id, sourceKey: record.sourceKey || `manual::${record.id}`, serviceType: record.serviceType, editorText: record.details };
}

const customers: Customer[] = (() => {
  const grouped = new Map<string, string[]>();
  for (const raw of importedNotes as string[]) {
    const clean = raw.replaceAll("￼", "").trim();
    const first = clean.split("\n").find(Boolean)?.trim() || "";
    if (!first || excludedTitles.test(first) || clean.length < 8) continue;
    const name = normalizeName(first);
    const body = clean.split("\n").slice(1).join("\n").trim();
    if (!name || !body) continue;
    const entries = grouped.get(name) || [];
    if (!entries.includes(clean)) entries.push(clean);
    grouped.set(name, entries);
  }
  return [...grouped.entries()].map(([name, entries]) => {
    const raw = entries.join("\n\n──── 同名筆記合併 ────\n\n");
    const dates = dateMatches(raw);
    const hasPerm = /燙|卷|捲|藥水|M1|M2|槓/.test(raw);
    const hasColor = /染|漂|雙氧|%|洗色|配方/.test(raw);
    const service: Customer["service"] = hasPerm && hasColor ? "燙染" : hasPerm ? "燙髮" : hasColor ? "染髮" : "待整理";
    const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
    const note = lines.find((x) => /\+|燙|漂|洗色|底色|沐浴染/.test(x) && x !== name) || "已匯入完整技術筆記";
    const uniqueDates = [...new Set(dates)].sort((a, b) => dateValue(b) - dateValue(a));
    return { name, date: uniqueDates[0] || "日期未記錄", note, service, raw, visits: Math.max(uniqueDates.length, 1) };
  }).sort((a, b) => dateValue(b.date) - dateValue(a.date));
})();

const dyes = ["13 胭脂粉", "0/20 紫", "5N 自然棕", "6N 自然棕", "7A 霧灰", "8A 冷灰", "藍色加強", "紅色加強"];
const additiveOptions = ["0/70"];
function isFormulaAdditive(name: string) { return /^(?:0\s*\/\s*70|070)$/i.test(name.trim()); }
function dyeSwatch(name: string) {
  const code = name.trim().toUpperCase();
  if (code === "R7" || /紅|石榴|羅馬紅/.test(name)) return "#c92f3d";
  if (code.startsWith("RV")) return "#9b3158";
  if (code.startsWith("O")) return "#d8752f";
  if (code.startsWith("P") || /紫|0\/20/.test(name)) return "#76539a";
  if (code.startsWith("Y")) return "#d6ad31";
  if (code.startsWith("G") || /綠/.test(name)) return "#4c8b62";
  if (code.startsWith("B") || /藍|清水|星際/.test(name)) return "#547ea7";
  if (/NB|自然棕|CB|MTB/.test(code)) return "#725a48";
  if (code === "0/70" || code === "070") return "#5f6870";
  return "#9a9a98";
}
const catalogSeries = [...new Set((dyeCatalog as { series: string; name: string }[]).map((item) => item.series))];
const rods = ["粉紅 10mm", "藍綠 13mm", "藍色 16mm", "紫色 19mm", "橘色 22mm", "16mm 標準捲度", "18mm 自然捲度", "20mm 大彎"];
const templates = {
  "標準八區": ["瀏海", "左前", "頭頂", "右前", "左後", "後腦", "右後", "頸背"],
  "頭頂五片": ["第1片", "第2片", "第3片", "第4片", "第5片", "左側", "右側", "後腦"],
  "海芋捲": ["頂心", "左上", "右上", "左中", "右中", "左下", "右下", "頸背"],
};
const lotionSeries = [...new Set((permLotions as { series: string }[]).map((item) => item.series))];
const initialPermLines: Record<string, boolean> = { redVertical: true, redHorizontal: true, blueUpper: true, blueLower: true, purpleFront: true, purpleUpper: true, purpleBack: true, green1: true, green2: true, green3: true, green4: true };

export default function Home() {
  const [section, setSection] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(60);
  const [developer, setDeveloper] = useState("6%");
  const [developerRatio, setDeveloperRatio] = useState(1);
  const [formula, setFormula] = useState<Record<string, number>>({ "13 胭脂粉": 2, "0/20 紫": 1 });
  const [additiveDilution, setAdditiveDilution] = useState<Record<string, number>>({ "0/70": 40 });
  const [selectedZones, setSelectedZones] = useState<Record<string, { rod: string; count: number; lotion: string; range: string; direction: string; softening: string; slice: string }>>({});
  const [activeZone, setActiveZone] = useState("頭頂");
  const [permTemplate, setPermTemplate] = useState<keyof typeof templates>("標準八區");
  const [activeLotionSeries, setActiveLotionSeries] = useState("全部藥水");
  const [damageMaps, setDamageMaps] = useState<Record<string, DamageSegment[]>>({ color: defaultDamage });
  const [hairConditionType, setHairConditionType] = useState<HairConditionType>("3段髮");
  const [saved, setSaved] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dyeSearch, setDyeSearch] = useState("");
  const [activeSeries, setActiveSeries] = useState("全部色號");
  const [permLines, setPermLines] = useState(initialPermLines);
  const [manualRecords, setManualRecords] = useState<ManualCustomerRecord[]>([]);
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [caseCustomer, setCaseCustomer] = useState("");
  const [caseDate, setCaseDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }));
  const [caseOperation, setCaseOperation] = useState("");
  const [caseResult, setCaseResult] = useState("");
  const [caseCorrection, setCaseCorrection] = useState({ expected: "", actual: "", cause: "", next: "", alert: "" });
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseSourceKey, setEditingCaseSourceKey] = useState<string | null>(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [section]);
  useEffect(() => { fetch("/api/customer-records").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setManualRecords(data.records || [])).catch(() => setRecordError("自訂客戶紀錄讀取失敗，請重新整理後再試")); }, []);
  useEffect(() => {
    if (recordDraft && recordDraft.structured === undefined && (recordDraft.id || recordDraft.sourceKey) && /染/.test(recordDraft.serviceType)) {
      const synthetic: Customer = { name: recordDraft.customerName, date: recordDraft.serviceDate, note: recordDraft.details, service: "染髮", raw: `${recordDraft.customerName}\n${recordDraft.serviceDate.replaceAll("-", "/")}\n${recordDraft.details}`, visits: 1 };
      const parsedRecord = parseServiceRecords(synthetic)[0];
      const parsedFormula = parsedRecord?.formulas[0];
      if (parsedFormula) {
        const ratioParts = parsedFormula.ratios.replace(/[（）()比例：]/g, "").split(/[+:]/).map((part) => part.trim()).filter(Boolean);
        const developerIndex = parsedFormula.ingredients.findIndex((item) => /(?:3|6|9|12)%|雙氧/.test(item));
        const additiveIndex = parsedFormula.ingredients.findIndex(isFormulaAdditive);
        const nextFormula: Record<string, number> = {};
        parsedFormula.ingredients.forEach((item, index) => { if (index !== developerIndex && index !== additiveIndex) nextFormula[item] = Math.max(.5, Number(ratioParts[index]) || 1); });
        if (additiveIndex >= 0) nextFormula[parsedFormula.ingredients[additiveIndex]] = 1;
        if (Object.keys(nextFormula).length) setFormula(nextFormula);
        const dyeGrams = parsedFormula.grams.filter((_, index) => index !== developerIndex && index !== additiveIndex).reduce((sum, value) => sum + value, 0);
        setTotal(Number(recordDraft.details.match(/染膏總量：\s*([\d.]+)/)?.[1]) || Math.max(1, Math.round(dyeGrams)));
        if (developerIndex >= 0) {
          setDeveloper(parsedFormula.ingredients[developerIndex].match(/(?:3|6|9|12)%/)?.[0] || "6%");
          setDeveloperRatio(Number(ratioParts[developerIndex]) || 1);
        }
        if (additiveIndex >= 0) setAdditiveDilution((old) => ({ ...old, [parsedFormula.ingredients[additiveIndex]]: Number(ratioParts[additiveIndex]?.split("/")[1]) || 40 }));
      }
      const readField = (label: string) => recordDraft.details.split("\n").find((line) => line.startsWith(label))?.slice(label.length).trim() || "";
      setCaseCustomer(recordDraft.customerName); setCaseDate(recordDraft.serviceDate);
      setCaseOperation(readField("操作過程：")); setCaseResult(readField("完成結果："));
      setCaseCorrection({ expected: readField("訂正・原本預期："), actual: readField("訂正・實際結果："), cause: readField("訂正・錯誤原因："), next: readField("訂正・下次修正："), alert: readField("訂正・AI提醒條件：") });
      setEditingCaseId(recordDraft.id || null); setEditingCaseSourceKey(recordDraft.sourceKey || null);
      setSaved(false); setRecordDraft(null); setSelectedCustomer(null); setSection("color");
      return;
    }
    if (recordDraft && recordDraft.structured === undefined && !recordDraft.id && !recordDraft.sourceKey && recordDraft.customerName && recordDraft.serviceType === "燙染") {
      setCaseCustomer(recordDraft.customerName);
      setCaseDate(recordDraft.serviceDate);
      setCaseOperation("");
      setCaseResult("");
      setCaseCorrection({ expected: "", actual: "", cause: "", next: "", alert: "" });
      setEditingCaseId(null);
      setEditingCaseSourceKey(null);
      setSaved(false);
      setRecordDraft(null);
      setSelectedCustomer(null);
      setSection("color");
      return;
    }
    if (recordDraft && recordDraft.structured === undefined) {
      setRecordDraft({ ...recordDraft, structured: true, developer: "6%", developerRatio: "1:1.5", additive: "不使用", additiveRatio: "1/40" });
    }
  }, [recordDraft]);

  const searchTerm = search.trim().toLowerCase();
  const displayCustomers = useMemo(() => {
    const merged = new Map(customers.map((customer) => [customer.name, { ...customer }]));
    for (const record of manualRecords) {
      const current = merged.get(record.customerName);
      if (current) {
        current.raw = `${current.raw}\n${record.serviceDate}\n${record.details}`;
        if (dateValue(record.serviceDate.replaceAll("-", "/")) > dateValue(current.date)) current.date = record.serviceDate.replaceAll("-", "/");
      } else {
        merged.set(record.customerName, { name: record.customerName, date: record.serviceDate.replaceAll("-", "/"), note: record.details.split("\n")[0] || "手動新增紀錄", service: (record.serviceType as Customer["service"]) || "待整理", raw: `${record.customerName}\n${record.serviceDate}\n${record.details}`, visits: 1 });
      }
    }
    return [...merged.values()].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [manualRecords]);
  const filtered = searchTerm
    ? displayCustomers.filter((c) => `${c.name}\n${c.date}\n${c.service}\n${c.note}\n${c.raw}`.toLowerCase().includes(searchTerm))
    : displayCustomers;
  const formulaEntries = Object.entries(formula);
  const baseFormulaEntries = formulaEntries.filter(([name]) => !isFormulaAdditive(name));
  const additiveEntries = formulaEntries.filter(([name]) => isFormulaAdditive(name));
  const formulaTotal = baseFormulaEntries.reduce((sum, [, ratio]) => sum + ratio, 0) || 1;
  const calculated = baseFormulaEntries.map(([name, ratio]) => ({ name, grams: (total * ratio) / formulaTotal }));
  const developerGrams = total * developerRatio;
  const preAdditiveTotal = total + developerGrams;
  const calculatedAdditives = additiveEntries.map(([name]) => ({ name, grams: preAdditiveTotal / (additiveDilution[name] || 40), dilution: additiveDilution[name] || 40 }));
  const additiveTotal = calculatedAdditives.reduce((sum, item) => sum + item.grams, 0);
  const mixedTotal = preAdditiveTotal + additiveTotal;
  const zones = templates[permTemplate];
  const currentZone = selectedZones[activeZone] || { rod: "藍色 16mm", count: 6, lotion: "水光系列一劑 M1 藍", range: "髮根 2–8cm", direction: "向後放射", softening: "80%", slice: "標準分片" };
  const visibleLotions = (permLotions as { series: string; name: string; spec: string; category: string }[]).filter((item) => activeLotionSeries === "全部藥水" || item.series === activeLotionSeries);
  const monthlyVisits = customers.filter((c) => c.date.startsWith("2026/08")).length;
  const sectionTitle = useMemo(() => ({ dashboard: "今日工作台", customers: "客戶技術履歷", color: "染髮配方計算", perm: "燙髮卷槓紀錄", notes: "燙染重點筆記", pos: "POS 串接中心" }[section]), [section]);
  const visibleCatalog = (dyeCatalog as { series: string; name: string }[]).filter((item) => !isFormulaAdditive(item.name) && (activeSeries === "全部色號" || item.series === activeSeries) && `${item.series}${item.name}`.toLowerCase().includes(dyeSearch.toLowerCase()));

  function toggleDye(name: string) {
    setFormula((old) => old[name] ? Object.fromEntries(Object.entries(old).filter(([key]) => key !== name)) : { ...old, [name]: 1 });
    if (isFormulaAdditive(name)) setAdditiveDilution((old) => ({ ...old, [name]: old[name] || 40 }));
    setSaved(false);
  }

  function updateZone(patch: Partial<typeof currentZone>) {
    setSelectedZones((old) => ({ ...old, [activeZone]: { ...currentZone, ...patch } }));
    setSaved(false);
  }

  function applyImportedFormula(parsed: ParsedFormula) {
    const developerIndex = parsed.ingredients.findIndex((item) => /(?:3|6|9|12)%|雙氧/.test(item));
    const nextFormula: Record<string, number> = {};
    parsed.ingredients.forEach((item, index) => {
      if (index !== developerIndex) nextFormula[item] = parsed.grams[index] || 1;
    });
    if (!Object.keys(nextFormula).length) return;
    const colorTotal = Object.entries(nextFormula).filter(([name]) => !isFormulaAdditive(name)).reduce((sum, [, value]) => sum + value, 0) || 1;
    const importedDilution = parsed.ratios.match(/1\s*\/\s*(\d+)/)?.[1];
    if (importedDilution) {
      const additive = Object.keys(nextFormula).find(isFormulaAdditive);
      if (additive) setAdditiveDilution((old) => ({ ...old, [additive]: Number(importedDilution) }));
    }
    if (developerIndex >= 0) {
      const developerGrams = parsed.grams[developerIndex] || colorTotal;
      setDeveloper(parsed.ingredients[developerIndex].match(/(?:3|6|9|12)%/)?.[0] || "6%");
      setDeveloperRatio(Number((developerGrams / colorTotal).toFixed(2)));
    }
    setFormula(nextFormula);
    setTotal(Math.max(1, Math.round(colorTotal)));
    setSelectedCustomer(null);
    setSection("color");
    setSaved(false);
  }

  function recordsForCustomer(customer: Customer): EditableServiceRecord[] {
    const imported = customers.find((item) => item.name === customer.name);
    const base = imported ? parseServiceRecords(imported).map((record, index) => {
      const sourceKey = `${customer.name}::${record.date}::${index}`;
      const override = manualRecords.find((item) => item.sourceKey === sourceKey);
      if (override) return manualToEditable(override);
      return { ...record, sourceKey, serviceType: customer.service, editorText: serializeServiceRecord(record) };
    }) : [];
    const added = manualRecords.filter((item) => item.customerName === customer.name && !item.sourceKey).map(manualToEditable);
    return [...base, ...added].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }

  async function saveRecordDraft() {
    if (!recordDraft) return;
    setRecordBusy(true); setRecordError("");
    try {
      const endpoint = recordDraft.id ? `/api/customer-record/${recordDraft.id}` : "/api/customer-records";
      const isColor = /染/.test(recordDraft.serviceType);
      const isPerm = /燙/.test(recordDraft.serviceType);
      const structuredLines = recordDraft.structured ? [
        isColor && recordDraft.dyeFormula && `染劑：${recordDraft.dyeFormula}`,
        isColor && recordDraft.dyeRatio && `染劑比例：${recordDraft.dyeRatio}`,
        isColor && recordDraft.dyeTotal && `染膏總量：${recordDraft.dyeTotal}g`,
        isColor && recordDraft.developer && `雙氧：${recordDraft.developer}・${recordDraft.developerRatio || "1:1"}`,
        isColor && recordDraft.additive && recordDraft.additive !== "不使用" && `加強色：${recordDraft.additive}・總量 ${recordDraft.additiveRatio || "1/40"}`,
        isPerm && recordDraft.permLotion && `燙髮藥水：${recordDraft.permLotion}`,
        isPerm && recordDraft.softening && `軟化程度：${recordDraft.softening}`,
        isPerm && recordDraft.rods && `卷槓／排列：${recordDraft.rods}`,
        recordDraft.operation && `操作過程：${recordDraft.operation}`,
        recordDraft.result && `完成結果：${recordDraft.result}`,
        recordDraft.correctionExpected && `訂正・原本預期：${recordDraft.correctionExpected}`,
        recordDraft.correctionActual && `訂正・實際結果：${recordDraft.correctionActual}`,
        recordDraft.correctionCause && `訂正・錯誤原因：${recordDraft.correctionCause}`,
        recordDraft.correctionNext && `訂正・下次修正：${recordDraft.correctionNext}`,
        recordDraft.correctionAlert && `訂正・AI提醒條件：${recordDraft.correctionAlert}`,
        recordDraft.details.trim() && `其他備註：${recordDraft.details.trim()}`,
      ].filter(Boolean).join("\n") : recordDraft.details;
      if (!structuredLines.trim()) throw new Error("請至少填寫一項服務內容");
      const response = await fetch(endpoint, { method: recordDraft.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...recordDraft, details: structuredLines }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      setManualRecords((old) => [...old.filter((item) => item.id !== data.id && (!data.sourceKey || item.sourceKey !== data.sourceKey)), data]);
      setRecordDraft(null);
    } catch (reason) { setRecordError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setRecordBusy(false); }
  }

  async function saveColorCase() {
    if (!caseCustomer.trim()) { setRecordError("請先填寫客戶名稱"); return; }
    setRecordBusy(true); setRecordError("");
    const ratioText = baseFormulaEntries.map(([, ratio]) => ratio).join(":");
    const ingredientLine = [...calculated.map((item) => item.name), developer, ...calculatedAdditives.map((item) => item.name)].join(" + ");
    const ratioLine = `${calculated.length === 1 ? `${ratioText}:${developerRatio}` : `${ratioText}+${developerRatio}`}${calculatedAdditives.map((item) => `+1/${item.dilution}`).join("")}`;
    const gramsLine = [...calculated.map((item) => item.grams), developerGrams, ...calculatedAdditives.map((item) => item.grams)].map((value) => Number(value.toFixed(1))).join(" + ");
    const details = [ingredientLine, ratioLine, gramsLine, `染膏總量：${total}g`, caseOperation.trim() && `操作過程：${caseOperation.trim()}`, caseResult.trim() && `完成結果：${caseResult.trim()}`, caseCorrection.expected.trim() && `訂正・原本預期：${caseCorrection.expected.trim()}`, caseCorrection.actual.trim() && `訂正・實際結果：${caseCorrection.actual.trim()}`, caseCorrection.cause.trim() && `訂正・錯誤原因：${caseCorrection.cause.trim()}`, caseCorrection.next.trim() && `訂正・下次修正：${caseCorrection.next.trim()}`, caseCorrection.alert.trim() && `訂正・AI提醒條件：${caseCorrection.alert.trim()}`].filter(Boolean).join("\n");
    try {
      const response = await fetch(editingCaseId ? `/api/customer-record/${editingCaseId}` : "/api/customer-records", { method: editingCaseId ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customerName: caseCustomer.trim(), serviceDate: caseDate, serviceType: "染髮", details, sourceKey: editingCaseSourceKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "儲存失敗");
      setManualRecords((old) => [...old.filter((item) => item.id !== data.id && (!data.sourceKey || item.sourceKey !== data.sourceKey)), data]); setEditingCaseId(data.id || editingCaseId); setSaved(true);
    } catch (reason) { setRecordError(reason instanceof Error ? reason.message : "儲存失敗"); }
    finally { setRecordBusy(false); }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-logo"><img src="/wesley-dandy-logo-white.jpg" alt="WESLEY DANDY" /></span><div><strong>W.D SalonHub</strong><small>ORDER・COLOR・PERM</small></div></div>
        <nav>
          {[
            ["dashboard", "⌂", "工作台"], ["customers", "◎", "客戶履歷"], ["color", "◉", "染髮配方"],
            ["perm", "◌", "燙髮紀錄"], ["notes", "≡", "技術筆記"], ["orders", "▣", "設計師叫貨"], ["pos", "↻", "POS 串接"],
          ].map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="sidebar-foot"><span className="sync-dot" />資料準備同步<span className="version">v0.1</span></div>
      </aside>

      <section className="workspace">
        <header><div><p className="eyebrow">WESLEY DANDY・內部使用</p><h1>{sectionTitle}</h1></div><div className="header-actions"><button className="ghost" onClick={() => setSection("customers")}>搜尋客戶</button><button className="primary" onClick={() => { setRecordError(""); setRecordDraft({ customerName: selectedCustomer?.name || "", serviceDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }), serviceType: section === "perm" ? "燙髮" : section === "color" ? "染髮" : "燙染", details: "", structured: true, dyeFormula: baseFormulaEntries.map(([name]) => name).join("＋"), dyeRatio: baseFormulaEntries.map(([, ratio]) => ratio).join("："), dyeTotal: String(total), developer, developerRatio: `1:${developerRatio}`, additive: additiveEntries[0]?.[0] || "不使用", additiveRatio: additiveEntries[0] ? `1/${additiveDilution[additiveEntries[0][0]] || 40}` : "1/40" }); }}>＋ 新增完整案件</button></div></header>

        {section === "dashboard" && <>
          <article className="global-customer-search">
            <div><small>ALL CLIENTS</small><h2>搜尋所有客戶資料</h2><p>不限日期，可搜尋姓名、服務內容、配方、色號或日期。</p></div>
            <div className="global-search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="輸入客戶姓名或筆記關鍵字…" aria-label="搜尋所有客戶資料" />{search && <button type="button" onClick={() => setSearch("")} aria-label="清除搜尋">×</button>}</div>
            {searchTerm && <div className="global-search-results"><div className="search-result-count">找到 {filtered.length} 位客戶</div>{filtered.length > 0 ? <CustomerRows rows={filtered.slice(0, 8)} onOpen={setSelectedCustomer} /> : <div className="search-empty">找不到符合的客戶或筆記內容</div>}{filtered.length > 8 && <button className="show-all-results" onClick={() => setSection("customers")}>查看全部 {filtered.length} 位結果</button>}</div>}
          </article>
          <div className="hero-card"><div><span className="live">WESLEY DANDY</span><h2>配方與技術，<br /><em>清楚留存。</em></h2><p>快速選取、換算、完成紀錄。</p><div className="hero-actions"><button onClick={() => setSection("color")}>染髮紀錄</button><button onClick={() => setSection("perm")}>燙髮紀錄</button></div></div><div className="formula-orb"><span>WD</span></div></div>
          <div className="stats"><article><small>已整理客戶</small><strong>{displayCustomers.length}</strong><span>完整燙染資料</span></article><article><small>本月服務紀錄</small><strong>{monthlyVisits}</strong><span>2026 年 8 月</span></article><article><small>待補消費金額</small><strong>{displayCustomers.length}</strong><span>等待 POS 回填</span></article></div>
          <div className="grid-two"><article className="panel"><div className="panel-title"><div><small>RECENT CLIENTS</small><h3>最近客戶</h3></div><button onClick={() => setSection("customers")}>查看全部</button></div><CustomerRows rows={displayCustomers.slice(0, 5)} onOpen={setSelectedCustomer} /></article><article className="panel notes-preview"><div className="panel-title"><div><small>QUICK NOTES</small><h3>髮根燙卷子使用</h3></div><span className="tag">已匯入</span></div><ul><li><i className="rod blue" />粗硬髮用藍</li><li><i className="rod teal" />細軟髮用藍綠</li><li><i className="rod pink" />超級細軟用粉紅</li><li><i className="drop" />藥水配方 M1＋水（1:1）</li></ul></article></div>
        </>}

        {section === "customers" && <article className="panel full"><div className="panel-title customer-search-heading"><div><small>ALL CLIENT HISTORY・不限日期</small><h3>搜尋所有客戶資料</h3><p>可搜尋姓名、服務內容、配方、色號或日期。</p></div><div className="customer-search-actions"><button className="new-customer-button" type="button" onClick={() => setRecordDraft({ customerName: "", serviceDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }), serviceType: "染髮", details: "" })}>＋ 新增客戶紀錄</button><div className="customer-search-input"><input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="輸入姓名或筆記關鍵字…" aria-label="搜尋所有客戶資料" />{search && <button type="button" onClick={() => setSearch("")} aria-label="清除搜尋">×</button>}</div></div></div>{searchTerm && <p className="customer-result-summary">找到 {filtered.length} 位客戶</p>}{filtered.length > 0 ? <CustomerRows rows={filtered} detailed onOpen={setSelectedCustomer} /> : <div className="search-empty">找不到符合的客戶或筆記內容</div>}{recordError && <p className="record-error">{recordError}</p>}</article>}

        {section === "color" && <div className="flow-layout">
          <article className="panel step-panel case-info-panel"><Step n="00" title="本次客戶與日期" /><div className="record-editor-row"><label>客戶名稱<input value={caseCustomer} onChange={(event) => { setCaseCustomer(event.target.value); setSaved(false); }} placeholder="輸入客戶姓名" /></label><label>服務日期<input type="date" value={caseDate} onChange={(event) => { setCaseDate(event.target.value); setSaved(false); }} /></label></div>{caseCustomer.trim() && caseDate && <ServicePhotos customer={caseCustomer.trim()} date={caseDate} />}</article>
          <article className="panel step-panel"><Step n="01" title="選擇染膏總量" /><div className="choice-row">{[30,45,60,90,120].map((g) => <button key={g} className={total === g ? "selected" : ""} onClick={() => setTotal(g)}>{g}<small>g</small></button>)}</div><label className="custom-total">或直接輸入總量<input type="number" min="1" value={total} onChange={(e) => setTotal(Math.max(1, Number(e.target.value)))} />g</label></article>
          <CustomerHairCondition type={hairConditionType} onTypeChange={setHairConditionType} segments={damageMaps[`color-${hairConditionType}`] || conditionDefaults[hairConditionType]} onChange={(segments) => setDamageMaps((old) => ({ ...old, [`color-${hairConditionType}`]: segments }))} />
          <article className="panel step-panel catalog-panel"><Step n="02" title={`點選染劑・共 ${dyeCatalog.length} 色`} /><div className="selected-dyes"><div><strong>已選染劑</strong><span>{baseFormulaEntries.length} 個</span></div>{baseFormulaEntries.length ? <div className="selected-dye-list">{baseFormulaEntries.map(([name]) => <button type="button" key={name} onClick={() => toggleDye(name)} aria-label={`取消 ${name}`}><span>{name}</span><b>×</b></button>)}</div> : <p>尚未選擇染劑</p>}</div><input className="dye-search" value={dyeSearch} onChange={(e) => setDyeSearch(e.target.value)} placeholder="搜尋色號或系列…" /><div className="series-tabs">{["全部色號",...catalogSeries].map((series) => <button key={series} className={activeSeries === series ? "selected" : ""} onClick={() => setActiveSeries(series)}>{series}</button>)}</div><div className="dye-grid catalog-grid">{[...visibleCatalog, ...[...new Set([...dyes, ...Object.keys(formula).filter((name) => !isFormulaAdditive(name))])].filter((name) => !dyeCatalog.some((item) => item.name === name)).map((name) => ({series:"筆記常用",name}))].map((item) => <button key={`${item.series}-${item.name}`} className={formula[item.name] ? "selected" : ""} onClick={() => toggleDye(item.name)}><i style={{ background: dyeSwatch(item.name) }} /><span><b>{item.name}</b><small>{item.series}</small></span></button>)}</div></article>
          <article className="panel step-panel"><Step n="03" title="設定染劑比例・最小 0.5" />{baseFormulaEntries.map(([name, ratio]) => <div className="ratio-line" key={name}><span>{name}</span><div><button disabled={ratio <= .5} onClick={() => setFormula({ ...formula, [name]: Math.max(.5, ratio - .5) })}>−</button><strong>{Math.max(.5, ratio)}</strong><button onClick={() => setFormula({ ...formula, [name]: Math.max(.5, ratio) + .5 })}>＋</button></div></div>)}</article>
          <article className="panel step-panel"><Step n="04" title="雙氧與比例" /><div className="inline-fields"><select value={developer} onChange={(e) => setDeveloper(e.target.value)}><option>3%</option><option>6%</option><option>9%</option><option>12%</option></select><select value={developerRatio} onChange={(e) => setDeveloperRatio(Number(e.target.value))}><option value={1}>1 : 1</option><option value={1.5}>1 : 1.5</option><option value={2}>1 : 2</option>{![1,1.5,2].includes(developerRatio) && <option value={developerRatio}>1 : {developerRatio}</option>}</select></div></article>
          <article className="panel step-panel additive-panel"><Step n="05" title="選擇加強色" /><p className="additive-help">這是配方最後一項；添加比例依「染劑＋雙氧」總量計算。</p><div className="additive-choice"><button type="button" className={!additiveEntries.length ? "selected" : ""} onClick={() => setFormula(Object.fromEntries(formulaEntries.filter(([name]) => !isFormulaAdditive(name))))}>不使用</button>{additiveOptions.map((name) => <button type="button" key={name} className={formula[name] ? "selected" : ""} onClick={() => { setFormula((old) => ({ ...Object.fromEntries(Object.entries(old).filter(([key]) => !isFormulaAdditive(key))), [name]: 1 })); setAdditiveDilution((old) => ({ ...old, [name]: old[name] || 40 })); setSaved(false); }}><i style={{ background: dyeSwatch(name) }} />{name}</button>)}</div>{additiveEntries.map(([name]) => <label className="additive-ratio-select" key={name}><span>{name}・總量添加比例</span><div className="additive-ratio-controls"><select value={additiveDilution[name] || 40} onChange={(event) => { setAdditiveDilution({ ...additiveDilution, [name]: Number(event.target.value) }); setSaved(false); }}>{[20,30,40,50,60,70,80,100,200].map((value) => <option key={value} value={value}>1/{value}</option>)}</select><strong>= {calculatedAdditives.find((item) => item.name === name)?.grams.toFixed(1) || "0.0"}g</strong></div></label>)}</article>
          <article className="panel step-panel case-notes-panel"><Step n="06" title="操作與完成結果" /><label>操作過程<textarea rows={4} value={caseOperation} onChange={(event) => { setCaseOperation(event.target.value); setSaved(false); }} placeholder="塗放位置、停留時間、操作方式…" /></label><label>完成結果／下次建議<textarea rows={4} value={caseResult} onChange={(event) => { setCaseResult(event.target.value); setSaved(false); }} placeholder="完成髮色、髮況與下次調整…" /></label><section className="formula-correction"><div><small>FORMULA CORRECTION・給未來 AI 學習</small><h3>配方訂正</h3></div><label>原本預期<input value={caseCorrection.expected} onChange={(event) => setCaseCorrection({ ...caseCorrection, expected: event.target.value })} placeholder="預期的色度、色調或效果" /></label><label>實際結果<input value={caseCorrection.actual} onChange={(event) => setCaseCorrection({ ...caseCorrection, actual: event.target.value })} placeholder="實際出現的偏色、明度或問題" /></label><label>判斷錯誤原因<textarea rows={3} value={caseCorrection.cause} onChange={(event) => setCaseCorrection({ ...caseCorrection, cause: event.target.value })} placeholder="髮底判斷、受損、色階、比例、雙氧、停留時間等哪裡有誤" /></label><label>下次修正方式<textarea rows={3} value={caseCorrection.next} onChange={(event) => setCaseCorrection({ ...caseCorrection, next: event.target.value })} placeholder="下次要更換什麼色號、比例或操作" /></label><label>AI 下次應提醒我<input value={caseCorrection.alert} onChange={(event) => setCaseCorrection({ ...caseCorrection, alert: event.target.value })} placeholder="例如：髮尾 9–10 度時避免再加…" /></label></section>{recordError && <p className="record-error">{recordError}</p>}</article>
          <aside className="result-card"><span>AUTO CALCULATED</span><h3>本次調配結果</h3><div className="total-orb"><strong>{mixedTotal.toFixed(1)}</strong><small>完成總量 g</small></div>{calculated.map((x) => <div className="result-line" key={x.name}><span>{x.name}</span><b>{x.grams.toFixed(1)}g</b></div>)}<div className="result-line developer"><span>{developer} 雙氧乳</span><b>{developerGrams.toFixed(1)}g</b></div>{calculatedAdditives.map((x) => <div className="result-line" key={x.name}><span>{x.name}（總量 1/{x.dilution}）</span><b>{x.grams.toFixed(1)}g</b></div>)}<button className="save" disabled={recordBusy} onClick={() => void saveColorCase()}>{recordBusy ? "儲存中…" : saved ? "✓ 已存入客戶履歷" : "儲存完整案件"}</button><small className="hint">客戶、日期、照片、配方與操作結果會一起保存</small></aside>
        </div>}

        {section === "perm" && <div className="perm-builder">
          <PermArrangementRecorder />
          <article className="panel lotion-library"><div className="panel-title"><div><small>PERM LOTION LIBRARY・來自設計師叫貨清單</small><h3>獨立點選藥水・共 {permLotions.length} 項</h3></div><span className="tag">目前：{currentZone.lotion}</span></div><div className="series-tabs">{["全部藥水", ...lotionSeries].map((series) => <button key={series} className={activeLotionSeries === series ? "selected" : ""} onClick={() => setActiveLotionSeries(series)}>{series}</button>)}</div><div className="lotion-grid">{visibleLotions.map((item) => <button key={`${item.series}-${item.name}`} className={currentZone.lotion === item.name ? "selected" : ""} onClick={() => updateZone({ lotion: item.name })}><span className="bottle-icon">{item.name.includes("二劑") ? "2" : "1"}</span><span><b>{item.name}</b><small>{item.series}・{item.spec}</small></span></button>)}</div></article>
        </div>}

        {section === "notes" && <div className="notes-grid"><article className="note-card featured"><small>ROOT PERM・已匯入</small><h3>髮根燙卷子使用</h3><ul><li>粗硬髮：藍色卷槓</li><li>細軟髮：藍綠色卷槓</li><li>超級細軟髮：粉紅色卷槓</li></ul><footer>M1＋水・比例 1:1</footer></article><article className="note-card"><small>COLOR・鄒書玉</small><h3>13 胭脂粉配方</h3><p>13 胭脂粉＋6% 雙氧＋0/20</p><footer>服務日期・2026/08/15</footer></article><article className="note-card add-note"><b>＋</b><h3>新增技術筆記</h3><p>記錄配方修正、軟化判斷與下次建議</p></article></div>}
        {section === "orders" && <article className="panel full order-embed"><div className="panel-title"><div><small>ORDER WORKSPACE・共用登入</small><h3>設計師叫貨</h3><p>保留原有叫貨清單、歷史貨單與送出流程。</p></div><a className="tag" href="/order-legacy.html" target="_blank" rel="noreferrer">在新分頁開啟</a></div><iframe title="設計師叫貨系統" src="/order-legacy.html" /></article>}

        {section === "pos" && <div className="pos-layout"><article className="panel pos-hero"><span className="pos-icon">POS</span><div><small>INTEGRATION READY</small><h2>交易完成，自動回填技術履歷</h2><p>系統已預留客戶編號、交易編號、消費日期、服務項目與實收金額欄位。取得 POS 廠商的 API 後即可正式同步。</p></div></article><div className="integration-flow"><div><b>1</b><h3>POS 結帳</h3><p>以電話或會員編號識別客戶</p></div><span>→</span><div><b>2</b><h3>自動配對</h3><p>連結本次染髮／燙髮紀錄</p></div><span>→</span><div><b>3</b><h3>完成履歷</h3><p>寫入日期、項目與消費金額</p></div></div><article className="panel connector"><div><div className="status-light" /><div><small>目前狀態</small><h3>等待指定 POS 系統</h3></div></div><button>設定串接資料</button></article></div>}
      </section>
      {selectedCustomer && <div className="record-backdrop" onClick={() => setSelectedCustomer(null)}><article className="record-sheet" onClick={(e) => e.stopPropagation()}><header><div><small>完整日期與可換算配方</small><h2>{selectedCustomer.name}</h2></div><div className="record-sheet-actions"><button className="add-case-button" type="button" onClick={() => { setRecordError(""); setRecordDraft({ customerName: selectedCustomer.name, serviceDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }), serviceType: "燙染", details: "" }); }}>＋ 新增案件</button><button className="close-record-button" type="button" onClick={() => setSelectedCustomer(null)} aria-label="關閉客戶資料">×</button></div></header><div className="record-meta"><span>{selectedCustomer.service}</span><span>{recordsForCustomer(selectedCustomer).length} 次服務</span><span>消費金額：待 POS 回填</span></div><div className="service-timeline">{recordsForCustomer(selectedCustomer).map((record, recordIndex) => <section className="service-card" key={`${record.sourceKey}-${recordIndex}`}><div className="service-date"><div><small>{record.serviceType}・服務日期</small><h3>{record.displayDate}</h3></div><div className="service-date-actions">{record.needsReview && <span>日期需確認</span>}<button type="button" onClick={() => { setRecordError(""); setRecordDraft({ id: record.id, sourceKey: record.id ? record.sourceKey.startsWith("manual::") ? null : record.sourceKey : record.sourceKey, customerName: selectedCustomer.name, serviceDate: record.date.replaceAll("/", "-").slice(0, 10), serviceType: record.serviceType, details: record.editorText }); }}>修改</button></div></div><ServicePhotos customer={selectedCustomer.name} date={record.date} />{record.formulas.map((parsed, formulaIndex) => <FormulaEquation key={formulaIndex} formula={parsed} index={formulaIndex} onApply={() => applyImportedFormula(parsed)} />)}{record.details.length > 0 && <div className="operation-notes"><strong>完整操作與結果</strong>{record.details.map((detail, index) => <p key={index}>{detail}</p>)}</div>}</section>)}</div></article></div>}
      {recordDraft && <div className="record-editor-backdrop" onClick={() => !recordBusy && setRecordDraft(null)}><form className="record-editor record-editor-complete" onSubmit={(event) => { event.preventDefault(); void saveRecordDraft(); }} onClick={(event) => event.stopPropagation()}><header><div><small>{recordDraft.id || recordDraft.sourceKey ? "EDIT SERVICE RECORD" : "NEW SERVICE CASE"}</small><h2>{recordDraft.id || recordDraft.sourceKey ? "修改過去服務紀錄" : "新增完整案件"}</h2></div><button type="button" onClick={() => setRecordDraft(null)} disabled={recordBusy}>×</button></header><label>客戶名稱<input required value={recordDraft.customerName} onChange={(event) => setRecordDraft({ ...recordDraft, customerName: event.target.value })} /></label><div className="record-editor-row"><label>服務日期<input required type="date" value={recordDraft.serviceDate} onChange={(event) => setRecordDraft({ ...recordDraft, serviceDate: event.target.value })} /></label><label>服務類型<select value={recordDraft.serviceType} onChange={(event) => setRecordDraft({ ...recordDraft, serviceType: event.target.value })}><option>染髮</option><option>燙髮</option><option>燙染</option><option>待整理</option></select></label></div>{recordDraft.structured && /染/.test(recordDraft.serviceType) && <fieldset className="record-detail-section"><legend>染髮配方</legend><div className="record-editor-row"><label>染劑品項<input value={recordDraft.dyeFormula || ""} onChange={(event) => setRecordDraft({ ...recordDraft, dyeFormula: event.target.value })} placeholder="例如：7星際灰＋13清水灰" /></label><label>染劑比例<input value={recordDraft.dyeRatio || ""} onChange={(event) => setRecordDraft({ ...recordDraft, dyeRatio: event.target.value })} placeholder="例如：1：1" /></label></div><div className="record-editor-row"><label>染膏總量（g）<input inputMode="decimal" value={recordDraft.dyeTotal || ""} onChange={(event) => setRecordDraft({ ...recordDraft, dyeTotal: event.target.value })} placeholder="例如：30" /></label><label>雙氧<select value={recordDraft.developer || "6%"} onChange={(event) => setRecordDraft({ ...recordDraft, developer: event.target.value })}><option>3%</option><option>6%</option><option>9%</option><option>12%</option></select></label></div><div className="record-editor-row"><label>雙氧比例<select value={recordDraft.developerRatio || "1:1.5"} onChange={(event) => setRecordDraft({ ...recordDraft, developerRatio: event.target.value })}><option>1:1</option><option>1:1.5</option><option>1:2</option></select></label><label>加強色<select value={recordDraft.additive || "不使用"} onChange={(event) => setRecordDraft({ ...recordDraft, additive: event.target.value })}><option>不使用</option><option>0/70</option></select></label></div>{recordDraft.additive === "0/70" && <label>加強色添加比例<select value={recordDraft.additiveRatio || "1/40"} onChange={(event) => setRecordDraft({ ...recordDraft, additiveRatio: event.target.value })}>{[20,30,40,50,60,70,80,100,200].map((value) => <option key={value}>1/{value}</option>)}</select></label>}</fieldset>}{recordDraft.structured && /燙/.test(recordDraft.serviceType) && <fieldset className="record-detail-section"><legend>燙髮內容</legend><label>藥水<input value={recordDraft.permLotion || ""} onChange={(event) => setRecordDraft({ ...recordDraft, permLotion: event.target.value })} placeholder="輸入使用藥水" /></label><div className="record-editor-row"><label>軟化程度<input value={recordDraft.softening || ""} onChange={(event) => setRecordDraft({ ...recordDraft, softening: event.target.value })} placeholder="例如：80%" /></label><label>卷槓與排列<input value={recordDraft.rods || ""} onChange={(event) => setRecordDraft({ ...recordDraft, rods: event.target.value })} placeholder="卷槓種類、尺寸、排列" /></label></div></fieldset>}{recordDraft.structured && <fieldset className="record-detail-section"><legend>操作與結果</legend><label>操作過程<textarea rows={3} value={recordDraft.operation || ""} onChange={(event) => setRecordDraft({ ...recordDraft, operation: event.target.value })} placeholder="塗放位置、停留時間、操作方式…" /></label><label>完成結果／下次建議<textarea rows={3} value={recordDraft.result || ""} onChange={(event) => setRecordDraft({ ...recordDraft, result: event.target.value })} placeholder="完成髮色、捲度、下次調整…" /></label></fieldset>}<label>{recordDraft.structured ? "其他備註" : "完整服務內容"}<textarea rows={recordDraft.structured ? 3 : 9} value={recordDraft.details} onChange={(event) => setRecordDraft({ ...recordDraft, details: event.target.value })} placeholder={recordDraft.structured ? "其他需要保留的細節…" : "輸入配方、比例、操作方式與結果…"} /></label>{recordDraft.structured && recordDraft.customerName && recordDraft.serviceDate && <fieldset className="record-detail-section"><legend>Before／After 照片</legend><ServicePhotos customer={recordDraft.customerName} date={recordDraft.serviceDate} /></fieldset>}{recordError && <p className="record-error">{recordError}</p>}<div className="record-editor-buttons"><button type="button" onClick={() => setRecordDraft(null)} disabled={recordBusy}>取消</button><button type="submit" disabled={recordBusy}>{recordBusy ? "儲存中…" : "儲存完整案件"}</button></div></form></div>}
    </main>
  );
}

function Step({ n, title }: { n: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(n === "02" || n === "06");
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const panel = ref.current?.closest(".step-panel");
    if (!panel) return;
    panel.classList.toggle("is-collapsed", collapsed);
    const check = () => {
      const fields = [...panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")];
      const hasValue = fields.some((field) => field.value.trim() !== "");
      const hasSelection = !!panel.querySelector("button.selected:not(:first-of-type), .selected-dye-list button, .ratio-line");
      setFilled(title.includes("本次客戶") ? Boolean(fields[0]?.value.trim() && fields[1]?.value.trim()) : title.includes("加強色") ? hasSelection : hasValue || hasSelection);
    };
    check();
    panel.addEventListener("input", check); panel.addEventListener("change", check); panel.addEventListener("click", check);
    const observer = new MutationObserver(check); observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => { panel.removeEventListener("input", check); panel.removeEventListener("change", check); panel.removeEventListener("click", check); observer.disconnect(); };
  }, [collapsed, title]);
  return <div className="step collapsible-step" ref={ref}><span>{n}</span><h3>{title}</h3><div className={`section-fill-status ${filled ? "filled" : "empty"}`}>{filled ? "已填寫" : "未填寫"}</div><button type="button" className="section-collapse-button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={`${collapsed ? "展開" : "收起"}${title}`}>{collapsed ? "⌄" : "⌃"}</button></div>;
}
type ArrangementPhoto = { id: string; kind: string; url: string; createdAt?: string };
function PermArrangementRecorder() {
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }));
  const [selectedRod, setSelectedRod] = useState(rods[0]);
  const [photos, setPhotos] = useState<ArrangementPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = `customer=${encodeURIComponent(customer.trim())}&date=${encodeURIComponent(date)}&scope=arrangement`;

  useEffect(() => {
    if (!customer.trim() || !date) { setPhotos([]); return; }
    let active = true;
    setError("");
    fetch(`/api/service-photos?${query}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setPhotos(data.photos || []); })
      .catch(() => { if (active) setError("照片讀取失敗，請稍後再試"); });
    return () => { active = false; };
  }, [query, customer, date]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (!customer.trim() || !date) { setError("請先填寫客戶名稱與服務日期"); return; }
    setBusy(true); setError("");
    try {
      const uploaded: ArrangementPhoto[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append("photo", file);
        const response = await fetch(`/api/service-photos?customer=${encodeURIComponent(customer.trim())}&date=${encodeURIComponent(date)}&kind=arrangement`, { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "照片上傳失敗");
        uploaded.push(data);
      }
      setPhotos((old) => [...uploaded, ...old]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "照片上傳失敗"); }
    finally { setBusy(false); }
  }

  async function remove(photo: ArrangementPhoto) {
    setBusy(true); setError("");
    try {
      const response = await fetch(photo.url, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setPhotos((old) => old.filter((item) => item.id !== photo.id));
    } catch { setError("刪除失敗，請稍後再試"); }
    finally { setBusy(false); }
  }

  return <>
    <article className="panel perm-photo-recorder">
      <div className="panel-title"><div><small>ROD ARRANGEMENT PHOTOS</small><h3>拍照記錄卷槓排列</h3></div><span className="tag">{photos.length} 張</span></div>
      <div className="perm-record-identity"><label>客戶名稱<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="輸入客戶名稱" /></label><label>服務日期<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      <label className={`arrangement-camera ${busy ? "busy" : ""}`}><b>{busy ? "照片處理中…" : "＋ 拍攝／加入卷槓排列照片"}</b><span>可重複拍攝，也可一次選取多張；張數不限</span><input type="file" accept="image/*" capture="environment" multiple disabled={busy} onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} /></label>
      {photos.length > 0 && <div className="arrangement-photo-grid">{photos.map((photo, index) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`${customer} 卷槓排列 ${photos.length - index}`} /></a><figcaption><span>排列照片 {photos.length - index}</span><button type="button" onClick={() => void remove(photo)} disabled={busy}>刪除</button></figcaption></figure>)}</div>}
      {error && <p className="photo-error">{error}</p>}
    </article>
    <article className="panel rod-selector">
      <div className="panel-title"><div><small>ROD LIBRARY</small><h3>選擇本次卷槓種類</h3></div><span className="tag">已選：{selectedRod}</span></div>
      <p className="rod-library-note">目前先建立圖片式選擇版面；你提供完整卷槓照片後，會直接換成實物照片。</p>
      <div className="rod-image-grid" role="radiogroup" aria-label="卷槓種類">{rods.map((rod, index) => <button type="button" role="radio" aria-checked={selectedRod === rod} className={selectedRod === rod ? "selected" : ""} key={rod} onClick={() => setSelectedRod(rod)}><span className={`rod-placeholder rod-tone-${index % 6}`}><i /><i /><i /><i /><i /></span><strong>{rod}</strong><small>圖片待補</small></button>)}</div>
    </article>
  </>;
}
function PermSideDiagram({ lines, onToggle }: { lines: Record<string, boolean>; onToggle: (key: string) => void }) {
  const choices = [
    ["redVertical", "紅色直線"], ["redHorizontal", "紅色橫線"],
    ["blueUpper", "藍色上弧線"], ["blueLower", "藍色下弧線"],
    ["purpleFront", "紫色前斜線"], ["purpleUpper", "紫色上斜線"], ["purpleBack", "紫色後斜線"],
    ["green1", "綠線 1"], ["green2", "綠線 2"], ["green3", "綠線 3"], ["green4", "綠線 4"],
  ];
  return <div className="perm-side-editor"><div className="perm-line-choices">{choices.map(([key, label]) => <button type="button" key={key} className={`${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)} ${lines[key] ? "selected" : ""}`} aria-pressed={lines[key]} onClick={() => onToggle(key)}><i />{label}<b>{lines[key] ? "×" : "+"}</b></button>)}</div><svg className="perm-profile-svg reference-profile" viewBox="0 356 591 567" role="img" aria-label="依照參考圖定位的可拆裝燙髮側面分區圖"><image href="/perm-side-reference-v3.jpg" x="0" y="0" width="591" height="1280"/><g className="line-erasers blue-clean"><path d="M247 371 C340 354 438 383 506 445 M247 371 C302 426 389 448 506 445"/></g><g className="line-erasers">{!lines.purpleFront && <path d="M177 421 L244 465"/>}{!lines.purpleUpper && <path d="M177 421 L236 384"/>}{!lines.purpleBack && <path d="M236 384 L244 465"/>}{!lines.redVertical && <path d="M329 423 L329 570"/>}{!lines.redHorizontal && <path d="M329 570 L500 570"/>}{!lines.green1 && <path d="M244 467 L502 467"/>}{!lines.green2 && <path d="M244 520 L520 520"/>}{!lines.green3 && <path d="M335 649 L478 649"/>}{!lines.green4 && <path d="M347 695 L443 695"/>}</g><g className="blue-lines">{lines.blueUpper && <path d="M251 377 C330 367 412 365 455 414 C463 423 470 430 475 433"/>}{lines.blueLower && <path d="M251 377 C305 421 390 433 475 433"/>}</g>{lines.redVertical && !lines.blueLower && <g className="red-lines"><path d="M329 295 L329 423"/></g>}</svg></div>;
}
function CustomerHairCondition({ type, onTypeChange, segments, onChange }: { type: HairConditionType; onTypeChange: (type: HairConditionType) => void; segments: DamageSegment[]; onChange: (segments: DamageSegment[]) => void }) {
  const options: HairConditionType[] = ["2段髮", "3段髮", "原生髮"];
  const [collapsed, setCollapsed] = useState(false);
  return <section className={`customer-hair-condition ${collapsed ? "is-collapsed" : ""}`}><div className="condition-heading"><div><small>HAIR CONDITION</small><h3>顧客髮況</h3></div><div className="condition-heading-actions"><span className="section-fill-status filled">已填寫</span><button type="button" className="section-collapse-button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>{collapsed ? "⌄" : "⌃"}</button></div></div><div className="condition-collapsible-body"><div className="condition-options" role="radiogroup" aria-label="顧客髮況類型">{options.map((option) => { const count = option === "原生髮" ? 1 : option === "2段髮" ? 2 : 3; return <button type="button" role="radio" aria-checked={type === option} className={type === option ? "selected" : ""} key={option} onClick={() => onTypeChange(option)}><i className="condition-icon">{Array.from({ length: count }).map((_, index) => <b key={index} />)}</i><strong>{option}</strong></button>; })}</div><HairDamageDiagram title={type} segments={segments} onChange={onChange} nested /></div></section>;
}
function HairDamageDiagram({ title, segments, onChange, nested = false }: { title: string; segments: DamageSegment[]; onChange: (segments: DamageSegment[]) => void; nested?: boolean }) {
  const update = (index: number, patch: Partial<DamageSegment>) => onChange(segments.map((segment, itemIndex) => itemIndex === index ? { ...segment, ...patch } : segment));
  return <article className={`${nested ? "" : "panel "}damage-diagram`}><div className="panel-title"><div><small>HAIR COLOR LEVEL MAP</small><h3>{title}</h3></div><span className="tag">{segments.length} 段</span></div><div className="damage-visual"><div className="hair-strand">{segments.map((segment, index) => <div key={segment.label} className={`damage-level-${segment.level}`} style={{ flex: Math.max(1, segment.cm) }}><span>{segment.label}</span><b>{hairColorLevels[segment.level] || hairColorLevels[0]}</b>{index < segments.length - 1 && <i />}</div>)}</div></div><div className="damage-controls" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>{segments.map((segment, index) => <div key={segment.label}><strong>{segment.label}</strong><label>長度<input type="number" min="0" max="100" value={segment.cm} onChange={(event) => update(index, { cm: Math.max(0, Number(event.target.value)) })} />cm</label><label>髮色色階<select value={segment.level} onChange={(event) => update(index, { level: Number(event.target.value) })}>{hairColorLevels.map((label, level) => <option value={level} key={label}>{label}</option>)}</select></label></div>)}</div><p className="damage-note">每一段分別記錄髮長與目前髮色色階，範圍為 5–6 度至 19–20 度。</p></article>;
}
type ServicePhoto = { id: string; kind: "before" | "after"; url: string };
function ServicePhotos({ customer, date }: { customer: string; date: string }) {
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const query = `customer=${encodeURIComponent(customer)}&date=${encodeURIComponent(date)}`;
  useEffect(() => { let active = true; fetch(`/api/service-photos?${query}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setPhotos(data.photos || []); }).catch(() => { if (active) setError("照片讀取失敗，請稍後再試"); }); return () => { active = false; }; }, [query]);
  async function upload(kind: "before" | "after", file?: File) {
    if (!file) return;
    setBusy(kind); setError("");
    const body = new FormData(); body.append("photo", file);
    try { const response = await fetch(`/api/service-photos?${query}&kind=${kind}`, { method: "POST", body }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "上傳失敗"); setPhotos((old) => [...old.filter((photo) => photo.kind !== kind), data]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "上傳失敗"); }
    finally { setBusy(null); }
  }
  async function remove(photo: ServicePhoto) {
    setBusy(photo.kind); setError("");
    try { const response = await fetch(photo.url, { method: "DELETE" }); if (!response.ok) throw new Error(); setPhotos((old) => old.filter((item) => item.id !== photo.id)); }
    catch { setError("刪除失敗，請稍後再試"); }
    finally { setBusy(null); }
  }
  return <div className="service-photos"><div className="photo-actions">{(["before", "after"] as const).map((kind) => <label key={kind} className={busy === kind ? "busy" : ""}>＋ {kind === "before" ? "Before" : "After"}<input type="file" accept="image/*" disabled={busy !== null} onChange={(event) => { const file = event.target.files?.[0]; void upload(kind, file); event.target.value = ""; }} /></label>)}</div>{photos.length > 0 && <div className="photo-grid">{photos.map((photo) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={`${customer} ${photo.kind === "before" ? "Before" : "After"}`} /></a><figcaption><span>{photo.kind === "before" ? "BEFORE" : "AFTER"}</span><button type="button" onClick={() => void remove(photo)} disabled={busy !== null}>刪除</button></figcaption></figure>)}</div>}{error && <p className="photo-error">{error}</p>}</div>;
}
function FormulaEquation({ formula, index, onApply }: { formula: ParsedFormula; index: number; onApply: () => void }) {
  const ratioParts = formula.ratios.replace(/[（）()比例：]/g, "").split(/[+:]/).map((part) => part.trim()).filter(Boolean);
  return <div className="formula-equation"><div className="formula-heading"><strong>配方 {index + 1}</strong><button onClick={onApply}>套用並換算 →</button></div><div className="equation-table"><div className="equation-label">品項</div><div className="equation-row">{formula.ingredients.map((item, itemIndex) => <span className="equation-part" key={`${item}-${itemIndex}`}><b>{item}</b>{itemIndex < formula.ingredients.length - 1 && <i>＋</i>}</span>)}</div><div className="equation-label">比例</div><div className="equation-row">{formula.ingredients.map((_, itemIndex) => <span className="equation-part" key={itemIndex}><b>{ratioParts[itemIndex] || "—"}</b>{itemIndex < formula.ingredients.length - 1 && <i>{itemIndex === 0 ? "：" : "＋"}</i>}</span>)}</div><div className="equation-label">用量</div><div className="equation-row grams">{formula.ingredients.map((_, itemIndex) => <span className="equation-part" key={itemIndex}><b>{formula.grams[itemIndex] ?? "—"}g</b>{itemIndex < formula.ingredients.length - 1 && <i>＋</i>}</span>)}</div></div></div>;
}
function CustomerRows({ rows, detailed = false, onOpen }: { rows: Customer[]; detailed?: boolean; onOpen?: (c: Customer) => void }) { return <div className="customer-list">{rows.map((c, i) => { const dates = [...new Set(dateMatches(c.raw))]; return <button type="button" className="customer-row" key={`${c.name}-${c.date}`} onClick={() => onOpen?.(c)} aria-label={`開啟 ${c.name} 的完整技術履歷`}><span className="avatar">{c.name.slice(0, 1)}</span><span className="customer-main"><strong>{c.name}</strong><small>{c.note}</small>{detailed && <span className="date-chips">{dates.slice(0,5).map((date) => <i key={date}>{date}</i>)}{dates.length > 5 && <i>＋{dates.length-5}</i>}</span>}</span><span className={`service s${i % 3}`}>{c.service}</span><time>{c.date}</time>{detailed && <><span className="amount">{dates.length || 1} 筆日期・待 POS 回填</span><span className="more">→</span></>}</button> })}</div>; }
