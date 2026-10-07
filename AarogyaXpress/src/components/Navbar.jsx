import { Search } from "lucide-react";

const Navbar = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
      
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center rounded-full font-bold">
          A
        </div>
        <span className="font-semibold">Aarogya Xpress</span>
      </div>

      <div className="flex items-center gap-3">
        <Search size={18} />
        <button className="bg-green-500 text-white px-4 py-1 rounded-full text-sm">
          Login
        </button>
      </div>

    </div>
  );
};

export default Navbar;