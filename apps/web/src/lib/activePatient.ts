"use client";

import { useEffect, useMemo, useState } from "react";
import type { Patient } from "@anamnesis/shared";
import { DEFAULT_PATIENT, patientRows } from "./patientData";

const ACTIVE_PATIENT_KEY = "anamnesis.activePatientId";
const CUSTOM_PATIENTS_KEY = "anamnesis.customPatients";

function defaultPatientOptions(): Patient[] {
  return patientRows.map((row) => ({
    id: row.id,
    name: row.name,
    consentGiven: row.consent !== "Pending",
  }));
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function readCustomPatients(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PATIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (patient): patient is Patient =>
        patient && typeof patient.id === "string" && typeof patient.name === "string" && typeof patient.consentGiven === "boolean",
    );
  } catch {
    return [];
  }
}

function writeCustomPatients(patients: Patient[]) {
  window.localStorage.setItem(CUSTOM_PATIENTS_KEY, JSON.stringify(patients));
}

export function datasetForPatient(patientId: string) {
  return `patient_${patientId}`;
}

export function generatePatientId(name: string) {
  const slug = safeSlug(name) || "patient";
  return `${slug}-${Date.now().toString(36)}`;
}

export function useActivePatient() {
  const [customPatients, setCustomPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState(DEFAULT_PATIENT.id);

  useEffect(() => {
    const custom = readCustomPatients();
    setCustomPatients(custom);
    const storedActive = window.localStorage.getItem(ACTIVE_PATIENT_KEY);
    if (storedActive) setActivePatientId(storedActive);
  }, []);

  const patients = useMemo(() => {
    const byId = new Map<string, Patient>();
    for (const patient of defaultPatientOptions()) byId.set(patient.id, patient);
    for (const patient of customPatients) byId.set(patient.id, patient);
    return Array.from(byId.values());
  }, [customPatients]);

  const activePatient = patients.find((patient) => patient.id === activePatientId) ?? patients[0] ?? DEFAULT_PATIENT;

  function selectPatient(patientId: string) {
    setActivePatientId(patientId);
    window.localStorage.setItem(ACTIVE_PATIENT_KEY, patientId);
  }

  function createPatient(input: { id?: string; name: string; consentGiven?: boolean }) {
    const name = input.name.trim();
    if (!name) throw new Error("Patient name is required.");
    const id = (input.id?.trim() || generatePatientId(name)).replace(/\s+/g, "-");
    if (!id) throw new Error("Patient ID is required.");
    if (patients.some((patient) => patient.id === id)) throw new Error("A patient with this ID already exists.");
    const patient: Patient = { id, name, consentGiven: input.consentGiven ?? true };
    const next = [...customPatients, patient];
    setCustomPatients(next);
    writeCustomPatients(next);
    selectPatient(patient.id);
    return patient;
  }

  return { activePatient, patients, selectPatient, createPatient };
}
