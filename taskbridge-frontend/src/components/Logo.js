import React from 'react';
import { useSettings } from '../context/SettingsContext';

const Logo = ({ size = 40, showText = true }) => {
    const { settings } = useSettings();
    const name = settings.platformName || "TaskBridge";

    // Split name for branded look (first word white, second part colored)
    const parts = name.match(/([A-Z][a-z]+|[A-Z]+(?=[A-Z][a-z]|$)|[a-z]+)/g) || [name];
    const firstWord = parts[0] || "Task";
    const rest = name.replace(firstWord, "") || "Bridge";

    return (
        <div className="logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div className="logo-container" style={{ width: size, height: size, position: 'relative' }}>
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Bridge Base */}
                    <path d="M10 80 Q 50 20 90 80" stroke="url(#logo-grad)" strokeWidth="8" strokeLinecap="round" />
                    {/* Connection Points */}
                    <circle cx="10" cy="80" r="8" fill="var(--user-primary)" className="logo-pulse" />
                    <circle cx="90" cy="80" r="8" fill="var(--admin-primary)" className="logo-pulse" />
                    {/* Central Beam */}
                    <path d="M40 45 L 60 45" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

                    <defs>
                        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--user-primary)" />
                            <stop offset="100%" stopColor="var(--admin-primary)" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            {showText && (
                <div className="logo-text" style={{ fontWeight: 900, fontSize: size * 0.6, letterSpacing: '-0.5px' }}>
                    <span style={{ color: 'var(--logo-task-color, white)' }}>{firstWord}</span>
                    <span style={{ color: 'var(--user-primary)' }}>{rest}</span>
                </div>
            )}
        </div>
    );
};

export default Logo;
