import Canvas from "./components/Canvas";

import { createBoard,updateBoard,getBoard,getBoards,
  deleteBoard,inviteMember,getAccessRequests,approveRequest,
  requestAccess,rejectRequest,getBoardMembers,removeMember } from "./api/boardApi";
import { useState,useEffect} from "react";
import { Navigate,useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { logout } from "./api/authApi";
import socket from "./socket";


function App() {
 const [elements, setElements] = useState([]);

  const [boards, setBoards] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [boardTitle, setBoardTitle] =useState("");
  const token =localStorage.getItem("token");
  const [usersCount,setUsersCount] =useState(0);
  const [cursors, setCursors] =useState({});
  const [inviteEmail, setInviteEmail] =useState("");
  const [accessRequests,setAccessRequests] =useState([]);
  const [accessDenied,setAccessDenied] =useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState([]);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [hoverMembers, setHoverMembers] = useState(false);
  const [hoverRequests, setHoverRequests] = useState(false);

  const fetchBoards = async () => {
    try {
      const res = await getBoards();
      setBoards(res.data);
    } catch (error) {
      console.log(error);
    }
  };


  const fetchAccessRequests = async () => {
    if (!id || !isOwner || accessDenied) return;

    try {
      const res = await getAccessRequests(id);
      setAccessRequests(res.data);
    } catch (error) {
      console.log(error);
    }
  };

 const fetchMembers = async () => {
  if (!id || !isOwner || accessDenied) return;

  try {
    const res = await getBoardMembers(id);
    

    setOwnerInfo(res.data.owner);
    setMembers(res.data.members || []);
  } catch (error) {
    console.log(error);
  }
};


    useEffect(() => {
      if (!id || !isOwner || accessDenied) return;

      fetchAccessRequests();

      const interval = setInterval(() => {
        fetchAccessRequests();
      }, 2000);

      return () => clearInterval(interval);
    }, [id, isOwner, accessDenied]);


    useEffect(() => {
      if(!token)return;
      fetchBoards();
    }, [token]);

    //interval of 2 sec
    useEffect(() => {
      if (!accessDenied || !id || !token) return;

      const interval = setInterval(async () => {
        try {
          const res = await getBoard(id);

          const currentUserId = JSON.parse(atob(token.split(".")[1])).userId;

          setElements(res.data.elements || []);
          setBoardTitle(res.data.title || "");
          setIsOwner(res.data.owner === currentUserId);
          setAccessDenied(false);
        } catch (error) {
          // still not approved
        }
      }, 2000);

      return () => clearInterval(interval);
    }, [accessDenied, id, token]);


    useEffect(() => {
      if (!token) return;
      socket.connect();

      return () => {
        socket.disconnect();
      };
    }, [token]);

    //join-board
    useEffect(() => {
      if (!id || accessDenied || !token) return;

      socket.emit("join-board", {
        boardId: id,
        token: localStorage.getItem("token"),
      });
    }, [id, accessDenied, token]);


    //board-state
    useEffect(() => {
      socket.on("board-state", ({ elements, title }) => {
        setElements(elements || []);
        setBoardTitle(title || "");
      });

      return () => {
        socket.off("board-state");
      };
    }, []);

    //users-count
    useEffect(() => {
      socket.on("users-count",(count) => {
          setUsersCount(count);
        }
      );

      return () => {
        socket.off("users-count");
      };

    }, []);

    //board-access-denied
    useEffect(() => {
      socket.on("board-access-denied",() => {
        setAccessDenied(true);
      });

      return () => {
        socket.off("board-access-denied");
      };
    }, [navigate]);

    //cursor-move
    useEffect(() => {
      socket.on("cursor-move", ({ socketId, x, y, name }) => {
        setCursors((prev) => ({
          ...prev,
          [socketId]: { x, y, name },
        }));
      });

      return () => {
        socket.off("cursor-move");
      };
    }, []);


    //cursor-remove
    useEffect(() => {
      socket.on("cursor-remove", (socketId) => {
        setCursors((prev) => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
      });

      return () => {
        socket.off("cursor-remove");
      };

    }, []);

    //drawing
    useEffect(() => {
      socket.on("drawing", (element) => {
        setElements((prev) => [
          ...prev,
          element
        ]);

      });

      return () => {
        socket.off("drawing");
      };
    }, []);


    //clear-board
    useEffect(() => {

      socket.on("clear-board",() => {
          setElements([]);
        }
      );

      return () => {
        socket.off("clear-board");
      };

    }, []);

    //move-element
    useEffect(() => {
      socket.on("move-element",(elements) => {
          setElements(elements);
        }
      );
      return () => {
        socket.off("move-element");
      };
    }, []);

    //resize-element
    useEffect(() => {

      socket.on("resize-element",(elements) => {
          setElements(elements);
        }
      );

      return () => {
        socket.off("resize-element");
      };

    }, []);

    //update element
    useEffect(() => {

      socket.on("update-elements",(elements) => {
          setElements(elements);
        }
      );

      return () => {
        socket.off("update-elements");
      };

    }, []);

    //delete-element
    useEffect(() => {

        socket.on("delete-element",(elements) => {
            setElements(elements);
          }
        );

        return () => {
          socket.off("delete-element");
        };

      }, []);


    //Auto Save Board after 2 seconds of inactivity
    useEffect(() => {
      if (!id || accessDenied) return;

      const timer = setTimeout(async () => {
        try {
          await updateBoard(id, boardTitle, elements);
          console.log("Auto Saved");
        } catch (error) {
          console.log(error);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }, [elements, boardTitle, id, accessDenied]);


    useEffect(() => {
      if (!id || !isOwner || accessDenied) return;

      fetchMembers();
    }, [id, isOwner, accessDenied]);

    if (!token) {
        localStorage.setItem(
        "redirectAfterLogin",
        window.location.pathname
      );

      return <Navigate to="/login" />;
    }

    //loadlastboard
    useEffect(() => {
        if (!token) return;

        const loadLastBoard = async () => {
          try {
            const boardId = id;
            if (!boardId) return;

            const res = await getBoard(boardId);
            const currentUserId = JSON.parse(atob(token.split(".")[1])).userId;

            setAccessDenied(false);
            setIsOwner(res.data.owner === currentUserId);
            setElements(res.data.elements || []);
            setBoardTitle(res.data.title || "");

            if (res.data.owner !== currentUserId) {
              setAccessRequests([]);
              setMembers([]);
              setOwnerInfo(null);
            }

          } catch (error) {
            setElements([]);
            if (error.response?.status === 403) {
              setAccessDenied(true);
              setIsOwner(false);
              setAccessRequests([]);
              setMembers([]);
              setOwnerInfo(null);
              return;
            }
            console.log(error);
          }
        };

        loadLastBoard();
      }, [id,token,navigate]);


    const handleCreateBoard = async () => {
      try {
      const res = await createBoard(
            "React Test Board"
          );

        navigate(
          `/board/${res.data._id}`
        );
      // setElements([]);  
        fetchBoards();
      } catch (error) {
        console.log(error);
      }
    };


    const handleSaveBoard = async () => {
      const boardId = id;

      if (!boardId) {
        alert("Select a board first");
        return;
      }

      console.log("Saving Board:", boardId);
    

      await updateBoard(
        boardId,
        boardTitle,
        elements
      );
      await fetchBoards();
      
      alert("Saved");
    };

    

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", backgroundColor: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* ─── TOP HEADER: Core Actions ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", zIndex: 50 }}>
        
        {/* Left Side: Board Setup */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            placeholder="Board Title"
            style={{ padding: "6px 12px", fontSize: "14px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", width: "180px" }}
          />
          <button
            onClick={handleCreateBoard}
            style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", cursor: "pointer" }}
          >
            Create Board
          </button>
          <button
            onClick={handleSaveBoard}
            style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer" }}
          >
            Save Board
          </button>
          <div style={{ width: "1px", height: "24px", backgroundColor: "#e5e7eb", margin: "0 4px" }} />
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link Copied");
            }}
            style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#f0fdf4", color: "#b91c1c", border: "1px solid #fecaca", cursor: "pointer" }}
          >
            Share Board
          </button>
        </div>

        {/* Right Side: Status & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#059669", backgroundColor: "#d1fae5", padding: "4px 10px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "6px", height: "6px", backgroundColor: "#10b981", borderRadius: "50%" }}></div>
            Users Online: {usersCount}
          </div>
          <button
            onClick={async () => {
              try { await logout(); } catch (error) { console.log(error); }
              localStorage.removeItem("token");
              localStorage.removeItem("name");
              navigate("/login");
            }}
            style={{ padding: "6px 12px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#ffffff", color: "#4b5563", border: "1px solid #d1d5db", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ─── SECONDARY TOOLBAR: My Boards & Owner Controls ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb", zIndex: 40 }}>
        
        {/* Horizontal Scrolling My Boards List */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflowX: "auto", paddingRight: "20px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>MY BOARDS:</span>
          {boards.length === 0 && <span style={{ fontSize: "12px", color: "#9ca3af" }}>No boards yet</span>}
          {boards.map((board) => (
            <div key={board._id} style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
              <button
                onClick={() => { navigate(`/board/${board._id}`); }}
                style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 500, color: "#374151", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
              >
                {board.title}
              </button>
              <button
                onClick={async () => {
                  await deleteBoard(board._id);
                  if (id === board._id) { setElements([]); navigate("/"); }
                  fetchBoards();
                }}
                style={{ padding: "4px 8px", fontSize: "12px", fontWeight: 600, color: "#ef4444", backgroundColor: "#fee2e2", border: "none", borderLeft: "1px solid #fca5a5", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Owner Controls (Invite & Access) */}
        {isOwner && !accessDenied && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            
            {/* Compact Invite Field */}
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden", backgroundColor: "white" }}>
              <input
                type="email"
                placeholder="Invite Email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ padding: "4px 8px", fontSize: "12px", border: "none", outline: "none", width: "150px" }}
              />
              <button
                onClick={async () => {
                  if (!id) { alert("Select a board first"); return; }
                  try {
                    await inviteMember(id, inviteEmail);
                    alert("Member Invited"); setInviteEmail(""); fetchMembers();
                  } catch (error) {
                    console.log(error);
                    alert(error.response?.data?.message || error.message || "Invite failed");
                  }
                }}
                style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 500, color: "white", backgroundColor: "#3b82f6", border: "none", cursor: "pointer" }}
              >
                Invite
              </button>
            </div>

            {/* Hover Menus */}
            <div style={{ display: "flex", gap: "8px" }}>
              
              {/* Access Requests */}
              <div style={{ position: "relative" }} onMouseEnter={() => setHoverRequests(true)} onMouseLeave={() => setHoverRequests(false)}>
                <button style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", cursor: "pointer" }}>
                  Requests {accessRequests.length > 0 && <span style={{ color: "red", fontWeight: "bold" }}>({accessRequests.length})</span>}
                </button>
                {hoverRequests && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", minWidth: "260px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100 }}>
                    {accessRequests.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", padding: "4px" }}>No pending requests</p>
                    ) : (
                      accessRequests.map((request) => (
                        <div key={request._id} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px", borderBottom: "1px solid #f3f4f6", fontSize: "12px" }}>
                          <span style={{ fontWeight: 500, color: "#374151" }}>{request.user.name} <br/><span style={{ color: "#6b7280", fontWeight: "normal" }}>({request.user.email})</span></span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={async () => {
                                try {
                                  if (id) { await updateBoard(id, boardTitle, elements); }
                                  await approveRequest(request._id); fetchAccessRequests(); fetchMembers(); alert("Approved");
                                } catch (error) { console.log(error); }
                              }}
                              style={{ flex: 1, padding: "4px", backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "4px", cursor: "pointer", fontWeight: 500 }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                try { await rejectRequest(request._id); fetchAccessRequests(); alert("Rejected"); } catch (error) { console.log(error); }
                              }}
                              style={{ flex: 1, padding: "4px", backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "4px", cursor: "pointer", fontWeight: 500 }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Board Members */}
              <div style={{ position: "relative" }} onMouseEnter={() => setHoverMembers(true)} onMouseLeave={() => setHoverMembers(false)}>
                <button style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 500, borderRadius: "6px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", cursor: "pointer" }}>
                  Members ({members.length})
                </button>
                {hoverMembers && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", minWidth: "260px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100 }}>
                    {ownerInfo && (
                      <div style={{ padding: "8px", fontSize: "12px", backgroundColor: "#f9fafb", borderRadius: "6px", marginBottom: "8px", border: "1px solid #f3f4f6" }}>
                        <strong style={{ color: "#374151" }}>Owner:</strong> <span style={{ color: "#6b7280" }}>{ownerInfo.name}</span>
                      </div>
                    )}
                    {members.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", padding: "4px" }}>No members yet</p>
                    ) : (
                      members.map((member) => (
                        <div key={member._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderBottom: "1px solid #f3f4f6", fontSize: "12px" }}>
                          <span style={{ fontWeight: 500, color: "#4b5563" }} title={member.email}>{member.name}</span>
                          <button
                            onClick={async () => {
                              try { await removeMember(id, member._id); fetchMembers(); alert("Member removed"); } 
                              catch (error) { console.log(error); alert(error.response?.data?.message || "Failed to remove member"); }
                            }}
                            style={{ padding: "2px 8px", fontSize: "11px", backgroundColor: "#ffffff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "4px", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MAIN WHITEBOARD AREA ─── */}
      <div style={{ flexGrow: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {accessDenied ? (
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", textAlign: "center", padding: "20px" }}>
            <div style={{ padding: "30px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", maxWidth: "400px" }}>
              <h2 style={{ margin: "0 0 16px 0", color: "#111827", fontSize: "20px" }}>Private Board</h2>
              <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>You don't have access to this board. You can request access from the owner.</p>
              <button
                onClick={async () => {
                  try { await requestAccess(id); alert("Request Sent"); } 
                  catch (error) { alert(error.response?.data?.message || "Failed"); }
                }}
                style={{ width: "100%", padding: "10px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: "#3b82f6", border: "none", borderRadius: "8px", cursor: "pointer", transition: "background 0.2s" }}
              >
                Request Access
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flexGrow: 1, position: "relative", width: "100%", height: "100%" }}>
            {/* Because the wrapper now takes up exactly the rest of the 100vh height, 
              your Canvas component will perfectly fill this entire remaining space.
            */}
            <Canvas elements={elements} setElements={setElements} boardId={id} cursors={cursors} />
          </div>
        )}
      </div>
      
    </div>
  );
}

export default App;