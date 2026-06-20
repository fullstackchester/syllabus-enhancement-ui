import { Outlet } from "react-router";

export function App() {
  return (
    <>
      <div className="flex min-h-svh">
        <Outlet></Outlet>
      </div>
    </>
  );
}

export default App;
