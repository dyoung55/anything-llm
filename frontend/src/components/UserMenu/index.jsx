import UserButton from "./UserButton";
import CustomBanner from "@/components/CustomBanner";

export default function UserMenu({ children }) {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <CustomBanner />
      <div className="flex-1 flex overflow-hidden relative">
        <UserButton />
        {children}
      </div>
    </div>
  );
}
