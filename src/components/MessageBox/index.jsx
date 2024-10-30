import React from "react";
import { FcInfo } from "react-icons/fc";
import { PiWarningFill } from "react-icons/pi";
import { VscError } from "react-icons/vsc";
import { HiQuestionMarkCircle } from "react-icons/hi";

const MsgBox = ({ data, onClose, isDesktop, options }) => {
  const { Caption, Text, Style, Btns } = data?.Properties;


  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };
  
  const containerStyle = {
    background: "white",
    width: "300px",
    height: "150px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "none",
  };
  
  const containerStyleWithBorder = {
    borderRadius: "10px",
  };
  
  const headerStyle = {
    fontSize: "12px",
    marginBottom: "10px",
    backgroundColor: "lightgrey",
    padding: "10px",
  };
  
  const headerWithBorder = {
    borderRadius: "10px",
  };
  
  const bodyStyle = {
    display: "flex",
    alignItems: "center",
    paddingLeft: "20px",
    marginTop: "20px",
    marginBottom: "20px",
  };
  
  const footerStyle = {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "lightgrey",
    padding: "10px",
  };
  
  const footerWithBorder = {
    borderRadius: "10px",
  };
  
  const roundedButtonStyle = {
    paddingLeft: "20px",
    paddingRight: "20px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    background: "white",
    cursor: "pointer",
    transition: "background 0.3s",
    fontSize: "12px",
  };
  
  const iconStyles = {
    info: {
      color: "blue",
      fontSize: "40px",
      marginRight: "10px",
    },
    question: {
      color: "rgb(29, 91, 179)",
      fontSize: "40px",
      marginRight: "10px",
    },
    warning: {
      color: "rgba(254, 167, 5, 0.812)",
      fontSize: "40px",
      marginRight: "10px",
    },
    error: {
      color: "red",
      fontSize: "40px",
      marginRight: "10px",
    },
  };
  

  const Icon = () => {
    switch (Style) {
      case "Info":
        return <FcInfo style={iconStyles.info} />;
      case "Query":
        return <HiQuestionMarkCircle style={iconStyles.question} />;
      case "Warn":
        return <PiWarningFill style={iconStyles.warning} />;
      case "Error":
        return <VscError style={iconStyles.error} />;
      default:
        return null;
    }
  };

  const renderCheck = options.Desktop !== 1;

  return (
    <div style={overlayStyle}>
      <div
        style={{
          ...containerStyle,
          ...(renderCheck && containerStyleWithBorder),
        }}
      >
        {renderCheck && (
          <div style={{ ...headerStyle, ...(renderCheck && headerWithBorder) }}>
            {Caption}
          </div>
        )}
        <div style={bodyStyle}>
          {Style && Style !== "Msg" && <Icon />}
          <span>{Text}</span>
        </div>
        <div
          style={{
            ...footerStyle,
            ...(renderCheck && footerWithBorder),
          }}
        >
          {Array.isArray(Btns) ? (
            Btns.map((btn, index) => (
              <button
                key={index}
                style={roundedButtonStyle}
                onClick={() => onClose(`MsgBtn${index + 1}`, data?.ID)}
              >
                {btn === "OK" ? "OK" : btn.charAt(0).toUpperCase() + btn.slice(1).toLowerCase()}
              </button>
            ))
          ) : (
            <button
              style={roundedButtonStyle}
              onClick={() => onClose("MsgBtn1", data?.ID)}
            >
              {Btns}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MsgBox;

