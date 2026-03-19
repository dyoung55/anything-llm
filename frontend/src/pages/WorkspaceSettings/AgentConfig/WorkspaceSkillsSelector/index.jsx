import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceAgentConfig from "@/models/workspaceAgentConfig";
import showToast from "@/utils/toast";
import { Robot } from "@phosphor-icons/react";
import { getDefaultSkills, getConfigurableSkills } from "@/pages/Admin/Agents/skills";
import { titleCase } from "text-case";

export default function WorkspaceSkillsSelector({ workspace }) {
  const { t } = useTranslation();
  const defaultSkills = useMemo(() => getDefaultSkills(t), [t]);
  const configurableSkills = useMemo(() => getConfigurableSkills(t), [t]);
  const [loading, setLoading] = useState(true);
  const [defaultSkillsList, setDefaultSkillsList] = useState([]);
  const [configurableSkillsList, setConfigurableSkillsList] = useState([]);
  const [toggling, setToggling] = useState({});

  useEffect(() => {
    fetchSkills();
  }, [workspace.slug]);

  const fetchSkills = async () => {
    setLoading(true);
    const { success, skills, error } =
      await WorkspaceAgentConfig.getAvailableSkills(workspace.slug);

    if (success) {
      setDefaultSkillsList(skills?.default || []);
      setConfigurableSkillsList(skills?.configurable || []);
    } else {
      showToast(`Error loading skills: ${error}`, "error", { clear: true });
    }
    setLoading(false);
  };

  const handleToggle = async (skillName, currentlyEnabled) => {
    setToggling((prev) => ({ ...prev, [skillName]: true }));

    const { success, error } = await WorkspaceAgentConfig.toggleSkill(
      workspace.slug,
      skillName,
      !currentlyEnabled
    );

    if (success) {
      // Update the local state
      setDefaultSkillsList((prev) =>
        prev.map((skill) =>
          skill.name === skillName
            ? { ...skill, enabled: !currentlyEnabled }
            : skill
        )
      );
      setConfigurableSkillsList((prev) =>
        prev.map((skill) =>
          skill.name === skillName
            ? { ...skill, enabled: !currentlyEnabled }
            : skill
        )
      );
      showToast(
        `Skill ${!currentlyEnabled ? "enabled" : "disabled"}`,
        "success",
        { clear: true }
      );
    } else {
      showToast(`Error: ${error}`, "error", { clear: true });
    }

    setToggling((prev) => ({ ...prev, [skillName]: false }));
  };

  const getSkillInfo = (skillName) => {
    return defaultSkills[skillName] || configurableSkills[skillName] || null;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
          <Robot size={24} className="text-theme-text-primary" />
          <h3 className="text-lg font-medium text-theme-text-primary">
            Agent Skills
          </h3>
        </div>
        <p className="text-sm text-theme-text-secondary">Loading skills...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        <Robot size={24} className="text-theme-text-primary" />
        <div>
          <h3 className="text-lg font-medium text-theme-text-primary">
            Agent Skills
          </h3>
          <p className="text-sm text-theme-text-secondary">
            Enable skills for this workspace
          </p>
        </div>
      </div>

      {defaultSkillsList.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <h4 className="text-sm font-medium text-theme-text-primary">
            Default Skills
          </h4>
          <div className="bg-theme-bg-secondary rounded-lg p-4">
            <div className="flex flex-col gap-y-3">
              {defaultSkillsList.map((skill) => {
                const skillInfo = getSkillInfo(skill.name);
                return (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between p-3 bg-theme-bg-primary rounded-lg"
                  >
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium text-theme-text-primary">
                        {skillInfo?.title || titleCase(skill.name.replace(/[_-]/g, " "))}
                      </span>
                      {skillInfo?.description && (
                        <span className="text-xs text-theme-text-secondary mt-1">
                          {skillInfo.description}
                        </span>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skill.enabled}
                        onChange={() => handleToggle(skill.name, skill.enabled)}
                        disabled={toggling[skill.name]}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {configurableSkillsList.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <h4 className="text-sm font-medium text-theme-text-primary">
            Configurable Skills
          </h4>
          <div className="bg-theme-bg-secondary rounded-lg p-4">
            <div className="flex flex-col gap-y-3">
              {configurableSkillsList.map((skill) => {
                const skillInfo = getSkillInfo(skill.name);
                return (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between p-3 bg-theme-bg-primary rounded-lg"
                  >
                    <div className="flex flex-col flex-1">
                      <span className="text-sm font-medium text-theme-text-primary">
                        {skillInfo?.title || titleCase(skill.name.replace(/[_-]/g, " "))}
                      </span>
                      {skillInfo?.description && (
                        <span className="text-xs text-theme-text-secondary mt-1">
                          {skillInfo.description}
                        </span>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skill.enabled}
                        onChange={() => handleToggle(skill.name, skill.enabled)}
                        disabled={toggling[skill.name]}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Only enabled skills will be available to the
          agent in this workspace. Default skills are enabled by default unless
          explicitly disabled.
        </p>
      </div>
    </div>
  );
}
