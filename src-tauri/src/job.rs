//! A process group the OS tears down for us. On Windows this is a Job Object with
//! kill-on-close: when the last handle closes — we drop it, or SquidCode exits in *any* way,
//! including a crash or a force-kill — Windows kills every process in the job. That is what
//! keeps a dev server (and its children) from outliving the app. Elsewhere it's a no-op and the
//! caller falls back to killing the child directly.

#[cfg(windows)]
mod imp {
    use std::os::windows::io::AsRawHandle;
    use std::process::Child;

    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    pub struct Job(HANDLE);

    // The handle is only ever used behind the DevServer mutex.
    unsafe impl Send for Job {}

    impl Job {
        pub fn new() -> Option<Job> {
            // SAFETY: plain Win32 calls with a zeroed, correctly sized info struct.
            unsafe {
                let handle = CreateJobObjectW(std::ptr::null(), std::ptr::null());
                if handle.is_null() {
                    return None;
                }
                let job = Job(handle); // dropped (closed) on every early return below
                let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
                info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                let ok = SetInformationJobObject(
                    handle,
                    JobObjectExtendedLimitInformation,
                    std::ptr::from_ref(&info).cast(),
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                );
                (ok != 0).then_some(job)
            }
        }

        /// Children the process spawns afterwards join the job automatically.
        pub fn assign(&self, child: &Child) -> bool {
            // SAFETY: both handles are valid for the duration of the call.
            unsafe { AssignProcessToJobObject(self.0, child.as_raw_handle() as HANDLE) != 0 }
        }
    }

    impl Drop for Job {
        fn drop(&mut self) {
            // SAFETY: we own the handle; closing it triggers kill-on-close.
            unsafe { CloseHandle(self.0) };
        }
    }
}

#[cfg(not(windows))]
mod imp {
    use std::process::Child;

    pub struct Job;

    impl Job {
        pub fn new() -> Option<Job> {
            None
        }
        pub fn assign(&self, _child: &Child) -> bool {
            false
        }
    }
}

pub use imp::Job;

#[cfg(all(test, windows))]
mod tests {
    use super::Job;
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};

    #[test]
    fn dropping_the_job_kills_the_process_and_its_children() {
        let mut child = Command::new("cmd")
            // cmd stays alive as the parent of a long-running ping.
            .raw_arg("/C ping -n 60 127.0.0.1 > nul")
            .creation_flags(0x0800_0000)
            .stdout(Stdio::null())
            .spawn()
            .unwrap();
        let job = Job::new().expect("job");
        assert!(job.assign(&child));
        std::thread::sleep(Duration::from_millis(500));
        assert!(child.try_wait().unwrap().is_none(), "should still be running");

        drop(job); // no child.kill(): the OS must do it
        let start = Instant::now();
        while child.try_wait().unwrap().is_none() {
            assert!(start.elapsed() < Duration::from_secs(5), "process survived the job");
            std::thread::sleep(Duration::from_millis(50));
        }
    }
}
