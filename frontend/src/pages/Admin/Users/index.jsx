import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { ArrowsDownUp, CaretDown, CaretUp, UserPlus } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import UserRow from "./UserRow";
import useUser from "@/hooks/useUser";
import NewUserModal from "./NewUserModal";
import { useModal } from "@/hooks/useModal";
import ModalWrapper from "@/components/ModalWrapper";
import CTAButton from "@/components/lib/CTAButton";
import Toggle from "@/components/lib/Toggle";

export default function AdminUsers() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="w-full h-full overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Users
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              These are all the accounts which have an account on this instance.
              Removing an account will instantly remove their access to this
              instance.
            </p>
          </div>
          <div className="overflow-x-auto mt-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, username or email..."
                className="border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none px-4 py-2 flex-1 max-w-sm"
              />
              <CTAButton onClick={openModal} className="mr-0 shrink-0">
                <UserPlus className="h-4 w-4" weight="bold" /> Add user
              </CTAButton>
            </div>
            <UsersContainer searchQuery={searchQuery} />
          </div>
        </div>
        <ModalWrapper isOpen={isOpen}>
          <NewUserModal closeModal={closeModal} />
        </ModalWrapper>
      </div>
    </div>
  );
}

function UsersContainer({ searchQuery = "" }) {
  const { user: currUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [sortColumn, setSortColumn] = useState("username");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    async function fetchUsers() {
      const _users = await Admin.users();
      setUsers(_users);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const displayedUsers = useMemo(() => {
    let list = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = a[sortColumn] ?? "";
      const bv = b[sortColumn] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [users, searchQuery, sortColumn, sortDirection]);

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  if (loading) {
    return (
      <Skeleton.default
        height="80vh"
        width="100%"
        highlightColor="var(--theme-bg-primary)"
        baseColor="var(--theme-bg-secondary)"
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-8"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <>
      <table className="w-full text-xs text-left rounded-lg min-w-[640px] border-spacing-0">
        <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
          <tr>
            <SortHeader col="username" label="Username" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="rounded-tl-lg" />
            <SortHeader col="fullName" label="Full Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            <SortHeader col="email" label="Email" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            <SortHeader col="role" label="Role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            <SortHeader col="createdAt" label="Date Added" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
            <th scope="col" className="px-6 py-3 rounded-tr-lg">{" "}</th>
          </tr>
        </thead>
        <tbody>
          {displayedUsers.map((user) => (
            <UserRow key={user.id} currUser={currUser} user={user} />
          ))}
        </tbody>
      </table>
      {displayedUsers.length === 0 && (
        <p className="text-sm text-theme-text-secondary py-4 text-center">
          {searchQuery.trim() ? "No users match your search." : "No users found."}
        </p>
      )}
    </>
  );
}

function SortHeader({ col, label, sortColumn, sortDirection, onSort, className = "" }) {
  const active = sortColumn === col;
  return (
    <th scope="col" className={`px-6 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center gap-x-1 uppercase font-bold hover:text-theme-text-primary transition-colors"
      >
        {label}
        {active ? (
          sortDirection === "asc" ? (
            <CaretUp weight="bold" size={12} />
          ) : (
            <CaretDown weight="bold" size={12} />
          )
        ) : (
          <ArrowsDownUp size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

const ROLE_HINT = {
  default: [
    "Can only send chats with workspaces they are added to by admin or managers.",
    "Cannot modify any settings at all.",
  ],
  manager: [
    "Can view, create, and delete any workspaces and modify workspace-specific settings.",
    "Can create, update and invite new users to the instance.",
    "Cannot modify LLM, vectorDB, embedding, or other connections.",
  ],
  admin: [
    "Highest user level privilege.",
    "Can see and do everything across the system.",
  ],
};

export function RoleHintDisplay({ role }) {
  return (
    <div className="flex flex-col gap-y-1 py-1 pb-4">
      <p className="text-sm font-medium text-theme-text-primary">Permissions</p>
      <ul className="flex flex-col gap-y-1 list-disc px-4">
        {ROLE_HINT[role ?? "default"].map((hints, i) => {
          return (
            <li key={i} className="text-xs text-theme-text-secondary">
              {hints}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MessageLimitInput({ enabled, limit, updateState, role }) {
  if (role === "admin") return null;
  return (
    <div className="mt-4 mb-8">
      <Toggle
        size="md"
        variant="horizontal"
        label="Limit messages per day"
        description="Restrict this user to a number of successful queries or chats within a 24 hour window."
        enabled={enabled}
        onChange={(checked) => {
          updateState((prev) => ({
            ...prev,
            enabled: checked,
          }));
        }}
      />
      {enabled && (
        <div className="mt-4">
          <label className="text-white text-sm font-semibold block mb-4">
            Message limit per day
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              onScroll={(e) => e.target.blur()}
              onChange={(e) => {
                updateState({
                  enabled: true,
                  limit: Number(e?.target?.value || 0),
                });
              }}
              value={limit}
              min={1}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
