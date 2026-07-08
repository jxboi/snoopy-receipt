import { ImageResponse } from "next/og";

export const alt = "Snoopy receipt detective app preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#fff8f2",
          color: "#2a2336",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            width: "620px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "18px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#ff6b5b",
                borderRadius: "999px",
                color: "white",
                display: "flex",
                fontSize: 42,
                fontWeight: 800,
                height: 86,
                justifyContent: "center",
                width: 86,
              }}
            >
              S
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ color: "#7b7488", fontSize: 30, fontWeight: 700 }}>
                Snoopy
              </div>
              <div style={{ color: "#ff6b5b", fontSize: 24, fontWeight: 700 }}>
                Your receipt detective
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <h1
              style={{
                fontSize: 76,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 0.96,
                margin: 0,
              }}
            >
              Receipts, but actually interesting.
            </h1>
            <p
              style={{
                color: "#7b7488",
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              Snap a receipt and get a friendly weekly report full of small finds,
              habits, and useful surprises.
            </p>
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: "100%",
            justifyContent: "center",
            position: "relative",
            width: "390px",
          }}
        >
          <div
            style={{
              background: "#ffefe3",
              borderRadius: "60px",
              height: "470px",
              position: "absolute",
              right: 0,
              top: 16,
              width: "310px",
            }}
          />
          <div
            style={{
              background: "white",
              border: "2px solid rgba(42, 35, 54, 0.06)",
              borderRadius: "42px",
              boxShadow: "0 24px 70px rgba(42, 35, 54, 0.18)",
              display: "flex",
              flexDirection: "column",
              padding: "28px",
              position: "relative",
              width: "340px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: 30, fontWeight: 900 }}>Starbucks</div>
                <div style={{ color: "#a9a3b4", fontSize: 22, fontWeight: 700 }}>
                  Today · Coffee
                </div>
              </div>
              <div
                style={{
                  alignItems: "center",
                  background: "#fff8f2",
                  borderRadius: "22px",
                  display: "flex",
                  fontSize: 32,
                  height: 64,
                  justifyContent: "center",
                  width: 64,
                }}
              >
                ☕
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                marginTop: "34px",
              }}
            >
              {[
                ["Grande oat latte", "$5.65"],
                ["Banana bread", "$4.25"],
                ["Tiny habit found", "4x"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    fontSize: 23,
                    fontWeight: 700,
                    justifyContent: "space-between",
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: "#7b7488" }}>{value}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#ffefe3",
                borderRadius: "28px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "34px",
                padding: "20px",
              }}
            >
              <div style={{ color: "#ff6b5b", fontSize: 20, fontWeight: 900 }}>
                Snoopy found
              </div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>
                Your coffee ritual is officially a pattern.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
