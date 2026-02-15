export default function PageFrame({ children, width = "max-w-md", top = "1.6rem", bottom = "1.6rem" }) {
  return (
    <main
      className="min-h-dvh px-4"
      style={{
        paddingTop: `calc(${top} + env(safe-area-inset-top))`,
        paddingBottom: `calc(${bottom} + env(safe-area-inset-bottom))`
      }}
    >
      <section className={`mx-auto w-full ${width}`}>{children}</section>
    </main>
  );
}
