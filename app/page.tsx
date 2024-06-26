"use client";

import { useState, useEffect, FC } from "react";
import EditDialog from "@/components/editDialog";
import {
  Exam,
  Attendance,
  EditingData,
  ImportExamData,
} from "@/lib/interfaces";
import {
  saveExamScheduleToLocalStorage,
  loadExamScheduleFromLocalStorage,
  calculateRemainingTime,
} from "@/lib/utils";
import screenfull from "screenfull";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCodeBranch,
  faSun,
  faMoon,
  faDisplay,
  faCircle,
  faCircleChevronRight,
  faExpand,
  faCompress,
  faFileImport,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as faCircleRegular } from "@fortawesome/free-regular-svg-icons";
import ImportDialog from "@components/importDialog";

const Home: FC = () => {
  const version = "0.3.1";
  const versionString = `Version ${version.slice(0, 3)}${
    version.slice(4) == "0" ? "" : ` Update ${version.slice(4)}`
  }`;

  function setTheme() {
    if (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  setTheme();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState<boolean>(false);
  const [currentEditingData, setCurrentEditingData] = useState<
    EditingData | undefined
  >(undefined);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [examSchedule, setExamSchedule] = useState<Exam[]>([
    { id: 1, subject: "數學", startTime: "01:00", endTime: "02:00" },
    { id: 2, subject: "國文", startTime: "03:00", endTime: "04:00" },
    { id: 3, subject: "自然", startTime: "05:00", endTime: "06:00" },
  ]);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [attendance, setAttendance] = useState<Attendance>({
    present: 36,
    total: 36,
  });
  const [showSchedule, setShowSchedule] = useState<boolean>(true);
  const [showCredits, setShowCredits] = useState<boolean>(false);

  const formatEditingData = (): EditingData => {
    return {
      subjects: examSchedule.map((exam) => exam.subject),
      startTimes: examSchedule.map((exam) => exam.startTime),
      endTimes: examSchedule.map((exam) => exam.endTime),
      attendanceData: {
        expectedAttendance: attendance.total,
        actualAttendance: attendance.present,
        absentSeatNumbers: attendance.absentSeatNumbers || "",
      },
      showSchedule: showSchedule,
    };
  };

  function getSchedule() {
    return examSchedule.map((exam) => (
      <li
        className={`my-1 flex text-6xl align-middle ${
          isTimePassed(exam.endTime) == "Just Passed"
            ? "opacity-20 font-thin"
            : isTimePassed(exam.endTime) == "Passed"
            ? "hidden"
            : currentExam && exam.id === currentExam.id
            ? "text-orange-600 dark:text-yellow-100"
            : "font-normal"
        }`}
        key={exam.id}
      >
        <FontAwesomeIcon
          icon={
            isTimePassed(exam.endTime) == "Just Passed"
              ? faCircleRegular
              : currentExam && exam.id === currentExam.id
              ? faCircleChevronRight
              : faCircle
          }
          className={"pt-2 my-auto text-3xl mr-4"}
        />
        {exam.startTime} - {exam.endTime} {exam.subject}
      </li>
    ));
  }

  function getScheduleCount() {
    const now = currentTime.getMinutes() + currentTime.getHours() * 60;
    let total = examSchedule.length;
    examSchedule.map((exam) => {
      const examTime =
        parseInt(exam.endTime.split(":")[1]) +
        parseInt(exam.endTime.split(":")[0]) * 60;
      if (
        now > examTime ||
        (now === examTime && currentTime.getSeconds() > 0)
      ) {
        total--;
      }
    });

    return total;
  }

  function isTimePassed(examTime: string) {
    const now = currentTime.getMinutes() + currentTime.getHours() * 60;
    const exam =
      parseInt(examTime.split(":")[1]) + parseInt(examTime.split(":")[0]) * 60;

    if (now > exam || (now === exam && currentTime.getSeconds() > 5)) {
      return "Passed";
    } else if (now === exam && currentTime.getSeconds() <= 5) {
      return "Just Passed";
    } else {
      return "Not Passed";
    }
  }

  const handleEditClick = () => {
    setCurrentEditingData(formatEditingData());
    setIsEditDialogOpen(true);
  };

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const handleDialogSave = (data: EditingData) => {
    setExamSchedule((prev) =>
      data.subjects.map((_subject, index) => ({
        ...prev[index],
        subject: data.subjects[index],
        startTime: data.startTimes[index],
        endTime: data.endTimes[index],
      })),
    );

    setAttendance({
      ...attendance,
      total: data.attendanceData.expectedAttendance,
      present: data.attendanceData.actualAttendance,
      absentSeatNumbers: data.attendanceData.absentSeatNumbers,
    });

    setShowSchedule(data.showSchedule);
    setIsEditDialogOpen(false);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleImportDialogClose = () => {
    setIsImportDialogOpen(false);
  };

  const handleImportData = (data: ImportExamData[]) => {
    setExamSchedule(data);
    setIsImportDialogOpen(false);
  };

  const handlePrefferedThemeChange = () => {
    if (!localStorage.getItem("theme")) {
      localStorage.setItem("theme", "light");
    } else {
      switch (localStorage.getItem("theme")) {
        case "light":
          localStorage.setItem("theme", "dark");
          break;

        case "dark":
          localStorage.removeItem("theme");
          break;
      }
    }
    setTheme();
  };

  const handleFullScreen = () => {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  };

  useEffect(() => {
    const savedSchedule = loadExamScheduleFromLocalStorage();
    if (savedSchedule.length > 0) {
      setExamSchedule(savedSchedule);
    }
  }, []);

  useEffect(() => {
    saveExamScheduleToLocalStorage(examSchedule);
  }, [examSchedule]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const now = currentTime;
    const current = examSchedule.find((exam) => {
      const examStartDate = new Date(now.toDateString() + " " + exam.startTime);
      const examEndDate = new Date(now.toDateString() + " " + exam.endTime);

      if (exam.endTime < exam.startTime) {
        examEndDate.setDate(examEndDate.getDate() + 1);
      }

      return now >= examStartDate && now <= examEndDate;
    });

    setCurrentExam(current ?? null);
  }, [currentTime, examSchedule]);

  return (
        )}
        <button
          className="ml-auto text-end text-gray-400 hover:text-gray-600 dark:text-gray-300 active:text-gray-500"
          onClick={() => handleFullScreen()}
        >
          <FontAwesomeIcon
            icon={screenfull.isFullscreen ? faCompress : faExpand}
            className={"mr-1"}
          />
          {screenfull.isFullscreen ? "離開全螢幕" : "啟動全螢幕"}
        </button>
        <button
          className="ml-3 text-end text-gray-400 hover:text-gray-600 hover:dark:text-gray-400 dark:text-gray-300 active:text-gray-500"
          onClick={() => handlePrefferedThemeChange()}
        >
          <FontAwesomeIcon
            icon={
              !localStorage.getItem("theme")
                ? faDisplay
                : localStorage.getItem("theme") === "dark"
                ? faMoon
                : faSun
            }
            className={"mr-1"}
          />
          {!localStorage.getItem("theme")
            ? `系統 (${
                document.documentElement.classList.contains("dark")
                  ? "暗色"
                  : "亮色"
              })`
            : localStorage.getItem("theme") === "dark"
            ? "暗色"
            : "亮色"}
        </button>
        <a
          href={`https://github.com/smitug01/exam-clock/releases/tag/v${version}`}
          className="ml-3 text-end text-gray-400 hover:text-gray-600 hover:dark:text-gray-400 dark:text-gray-300 active:text-gray-500"
        >
          <FontAwesomeIcon icon={faCodeBranch} className={"mr-1"} />
          {versionString} ({version})
        </a>
      </div>
      <EditDialog
        isOpen={isEditDialogOpen}
        onClose={handleEditDialogClose}
        onSave={handleDialogSave}
        initialData={currentEditingData}
      />
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={handleImportDialogClose}
        onImportData={handleImportData}
      />
      <div className="transition-colors p-4 bg-white dark:bg-slate-900 min-h-screen flex flex-col">
        <div className="flex flex-grow justify-center items-center flex-col">
          {currentExam && (
            <div className="text-5xl mb-2 font-black text-black dark:text-white">
              {currentExam.subject}
            </div>
          )}
          <div className="text-9xl mb-2 font-black text-black dark:text-white">
            {currentTime.toLocaleTimeString("en-US", { hour12: false })}
          </div>
          <br />
          {currentExam && (
            <div className="text-6xl font-black text-black dark:text-white">
              還剩 {calculateRemainingTime(currentExam.endTime)}
            </div>
          )}
        </div>
        <div className="flex justify-between relative items-end mt-4 text-black dark:text-white">
          {!showSchedule && currentExam ? (
            <></>
          ) : (
            <>
              {getScheduleCount() != 0 ? (
                <span
                  className={`${
                    getScheduleCount() > 3
                      ? document.documentElement.classList.contains("dark")
                        ? "txt txt-overflow-dark"
                        : "txt txt-overflow"
                      : ""
                  } max-h-64 hover:max-h-88`}
                >
                  <h2 className="text-4xl mb-2">今天的考程表:D</h2>
                  <ul>{getSchedule()}</ul>
                </span>
              ) : (
                <span>
                  <h2 className="text-4xl mb-2">今日已無更多考試項目😊</h2>
                  <ul className="text-normal opacity-60">
                    點擊<span className="font-bold">「編輯考程及人數」</span>
                    來新增更多考試項目
                  </ul>
                </span>
              )}
            </>
          )}
          <div className="transition-colors flex flex-col text-4xl font-medium ml-auto content-end text-end">
            <span className="my-1 flex text-6xl align-middle font-normal">應到人數</span>
            <span>
              {attendance.total}
              <span className="text-2xl"> 人</span>
            </span>
            <span className="text-2xl opacity-75 mt-2">實到人數</span>
            <span>
              {attendance.present != attendance.total ? (
                <span className="text-2xl text-red-400">
                  (-{attendance.total - attendance.present}){" "}
                </span>
              ) : (
                <></>
              )}
              {attendance.present}
              <span className="text-2xl"> 人</span>
            </span>
            {attendance.absentSeatNumbers ? (
              <>
                <span className="text-2xl opacity-75 mt-2">缺席座號</span>
                <span>
                  {attendance.absentSeatNumbers.replaceAll(",", ", ")}
                </span>
              </>
            ) : (
              <>全到，無缺考</>
            )}
          </div>
        </div>
        <div className="flex items-end mt-8">
          <button
            className="flex flex-row transition-all my-auto bg-blue-500 text-white px-6 py-3 rounded text-2xl font-medium hover:bg-blue-600 active:scale-95"
            onClick={() => handleEditClick()}
          >
            <FontAwesomeIcon
              icon={faPenToSquare}
              className={"sm:mr-1 sm:my-auto"}
            />
            <p className={"max-sm:hidden"}>編輯考程與人數</p>
          </button>
          <button
            className="flex flex-row transition-all my-auto ml-3 sm:ml-8 bg-green-500 text-white px-6 py-3 rounded text-2xl font-medium hover:bg-green-600 active:scale-95"
            onClick={() => handleImportClick()}
          >
            <FontAwesomeIcon
              icon={faFileImport}
              className={"sm:mr-1 sm:my-auto"}
            />
            <p className={"max-sm:hidden"}>導入考程與人數</p>
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
