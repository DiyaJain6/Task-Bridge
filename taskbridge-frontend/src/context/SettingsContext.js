import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        platformName: "TaskBridge",
        maintenanceMode: false,
        defaultPriority: "MEDIUM"
    });

    const refreshSettings = async () => {
        try {
            // Try public settings first (no token needed)
            const publicRes = await api.get("/admin/public/settings");
            const newSettings = { ...settings };
            Object.entries(publicRes.data).forEach(([key, val]) => {
                newSettings[key] = val === "true" ? true : (val === "false" ? false : val);
            });

            // If we have a token, try full settings
            if (localStorage.getItem("token")) {
                const adminRes = await api.get("/admin/settings");
                adminRes.data.forEach(s => {
                    let val = s.settingValue;
                    if (val === "true") val = true;
                    if (val === "false") val = false;
                    newSettings[s.settingKey] = val;
                });
            }

            setSettings(newSettings);
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
