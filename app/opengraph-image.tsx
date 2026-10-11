import { ImageResponse } from "next/og";

export const alt = "MadTec — Independent creator. Online whenever.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#101210",
          color: "#f1f2eb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#c6fa4b",
              color: "#101210",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
              fontWeight: 800,
            }}
          >
            M
          </div>
          <span style={{ fontSize: "22px", letterSpacing: "5px" }}>MADTEC / FIELD NOTE 001</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "112px", fontWeight: 800, letterSpacing: "-8px" }}>MADTEC</span>
          <span style={{ fontSize: "27px", color: "#a4aaa0" }}>INDEPENDENT CREATOR. ONLINE WHENEVER.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "17px", color: "#a4aaa0" }}>
          <span>TWITCH / YOUTUBE / TRANSMISSION</span>
          <span>INDEPENDENT / ONLINE WHENEVER</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
