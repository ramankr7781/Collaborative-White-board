import Canvas from "./components/Canvas";

import { createBoard,updateBoard,getBoard,getBoards,deleteBoard } from "./api/boardApi";
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

  const fetchBoards = async () => {
    try {
      const res = await getBoards();
      setBoards(res.data);
    } catch (error) {
      console.log(error);
    }
  };


    useEffect(() => {
      if(!token)return;
      fetchBoards();
    }, [token]);


  useEffect(() => {
    socket.connect();
    if (id) {
      socket.emit("join-board",id);
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);



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



  useEffect(() => {

    socket.on("clear-board",() => {
        setElements([]);
      }
    );

    return () => {
      socket.off("clear-board");
    };

  }, []);


  useEffect(() => {
    socket.on("move-element",(elements) => {
        setElements(elements);
      }
    );
    return () => {
      socket.off("move-element");
    };
  }, []);


  useEffect(() => {

    socket.on("resize-element",(elements) => {
        setElements(elements);
      }
    );

    return () => {
      socket.off("resize-element");
    };

  }, []);


  useEffect(() => {

    socket.on("update-elements",(elements) => {
        setElements(elements);
      }
    );

    return () => {
      socket.off("update-elements");
    };

  }, []);

  //Auto Save Board after 2 seconds of inactivity
  useEffect(() => {

      if (!id) return;

      const timer =setTimeout(async () => {

          try {
            await updateBoard(
              id,
              boardTitle,
              elements
            );

            console.log("Auto Saved");

          } catch (error) {
            console.log(error);
          }

        }, 1000);

      return () =>
        clearTimeout(timer);

    }, [
      elements,
      boardTitle,
      id
    ]);


  if (!token) {
    return <Navigate to="/login" />;
  }

  useEffect(() => {
      if (!token) return;

      const loadLastBoard = async () => {
        try {
          const boardId = id;
          if (!boardId) return;

          const res =
            await getBoard(boardId);

          setElements(
            res.data.elements || []
          );

          setBoardTitle(
            res.data.title || ""
          );

        } catch (error) {
          setElements([]);
          console.log(error);
        }
      };

      loadLastBoard();
    }, [id,token]);


  const handleCreateBoard = async () => {
    try {
    const res = await createBoard(
          "React Test Board"
        );

      console.log(res.data);

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
  console.log("Elements:", elements);

  await updateBoard(
    boardId,
    boardTitle,
    elements
  );
  await fetchBoards();
  
  alert("Saved");
};



  return (
    <>
      <button onClick={handleCreateBoard}>
        Create Board
      </button>

      <input
        type="text"
        value={boardTitle}
        onChange={(e) =>
          setBoardTitle(e.target.value)
        }
        placeholder="Board Title"
      />


      <button onClick={handleSaveBoard}>
          Save Board
      </button>

      <h3>My Boards</h3>
 
      {boards.map((board) => (
        <div key={board._id}>
          <button
            onClick={() => {
              navigate(
                `/board/${board._id}`
              );
            }}
          >
            {board.title}
          </button>

          <button
            onClick={async () => {
              await deleteBoard(board._id);

              if (id === board._id) {
                setElements([]);
                navigate("/");
              }

              fetchBoards();
            }}
          >
            Delete
          </button>
        </div>
      ))}

      

      <button
        onClick={async () => {
          try {

            await logout();

          } catch (error) {
            console.log(error);
          }

          localStorage.removeItem("token");

          navigate("/login");
        }}
      >
        Logout
      </button>


        <button
  onClick={() => {
    socket.emit(
      "drawing",
      {
        boardId: id,
        element: {
          test: "hello"
        }
      }
    );
  }}
>
  Test Socket
</button>


      <Canvas
        elements={elements}
        setElements={setElements}
        boardId={id}
      />
    </>
  );
}

export default App;