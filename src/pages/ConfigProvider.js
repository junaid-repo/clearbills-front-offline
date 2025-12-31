import React, { createContext, useContext, useEffect, useState } from "react";

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch("/config.json")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => {
        console.error("❌ Failed  to load config.json", err);
      });
  }, []);

  // ⏸️ Block app until config is loaded
  if (!config) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading configuration...</div>;
  }

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  return useContext(ConfigContext);
};
