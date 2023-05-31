import { ChangeEvent, useEffect, useState } from "react";
import { BigNumberish } from "ethers";

import "./App.css";
import axios from "axios";

const hashData = (data: bigint) => data + 1n;

interface ServerResponse {
  error?: string;
  tx: string;
}

const backendUrl = "https://zkauth.lookonly.ru"; //import.meta.env.BACKEND_URL;

console.log({ backendUrl });
const underlying = "0x4E9450B3Bc25Ab02447594903f5e3fFD01893D12"; // import.meta.env.UNDERLYING;
const mainContract = "0xC9068cCE3bAc43984cd0c329D0e8EF96D893B25e";

const etherscan = "https://goerli.etherscan.io/tx/";
const tokenEtherscan = "https://goerli.etherscan.io/token/" + underlying;
const contractEtherscan = "https://goerli.etherscan.io/address/" + mainContract;

function App() {
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [recepient, setRecepient] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [tx, setTx] = useState<string>("");

  // @ts-ignore
  const snarkjs = window.snarkjs;

  const handleLoginChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogin(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleRecepientChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRecepient(e.target.value);
  };

  const stringToDecimal = (str: string) => {
    let decimal = "";
    for (let i = 0; i < str.length; i++) {
      decimal += str.charCodeAt(i);
    }
    return BigInt(decimal);
  };

  const clearToasts = () => {
    setError("");
    setSuccess("");
    setTx("");
  };

  const asyncHandleRegister = async () => {
    clearToasts();

    if (!login || !password) {
      setError("Please fill in both login and password fields.");
      return;
    }

    const decimalPassword = stringToDecimal(password);

    console.log({ decimalPassword });

    const isRegisteredResponse = await axios.get(
      backendUrl + "/isUserRegistered/" + login
    );
    if (
      isRegisteredResponse.status === 200 &&
      isRegisteredResponse.data.isUserRegistered
    ) {
      setError("User already registered.");
      return;
    }

    const hashedPassword = hashData(decimalPassword);

    setSuccess("Registering... Please wait.");
    setError("");

    axios
      .post<ServerResponse>(backendUrl + "/register", {
        login,
        hashedPassword: hashedPassword.toString(),
      })
      .then((response) => {
        if (response.status === 200) {
          setSuccess("Registration successful!");
          setTx(response.data.tx);
        } else {
          setSuccess("");
          setError(response.data.error || "Registration failed.");
        }
      })
      .catch((error) => {
        setSuccess("");
        setError(error.response.data.split(`"`)[1]);
      });
  };

  const handleRegister = () => {
    asyncHandleRegister();
  };

  const asyncHandleTransfer = async () => {
    clearToasts();

    if (!login || !password) {
      setError("Please fill in both login and password fields.");
      return;
    }

    setSuccess("Creating proof... Please wait.");
    setError("");

    const numPassword = stringToDecimal(password);

    // here plus 1 is hash function
    const passwordHash = hashData(numPassword);
    const passwordPlusOneHash = hashData(numPassword + 1n);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        password: numPassword.toString(),
        passwordHash: passwordHash.toString(),
        passwordPlusOneHash: passwordPlusOneHash.toString(),
      },
      "zkauth.wasm",
      "zkauth.zkey"
    );

    console.log({ proof, publicSignals });

    setSuccess("Proof created, tokens transferring... Please wait.");

    axios
      .post<ServerResponse>(backendUrl + "/login", {
        login,
        proof,
        publicSignals,
        recepient,
      })
      .then((response) => {
        if (response.status === 200) {
          setSuccess("Transfer successful!");
          setTx(response.data.tx);
        } else {
          console.log({ response });
          setSuccess("");
          setError(response.data.error || "login failed.");
        }
      })
      .catch((error) => {
        setSuccess("");
        if (error.response.data.includes('"')) {
          setError(error.response.data.split(`"`)[1]);
        } else {
          setError(error.response.data);
        }
      });
  };

  const handleTransfer = async () => {
    asyncHandleTransfer();
  };

  const metamaskActions = async () => {
    // @ts-ignore
    if (window.ethereum) {
      // @ts-ignore
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x5" }], // Goerli chainId: '0x5'
      });

      const tokenAddress = underlying; // Replace with the actual token address
      const tokenSymbol = "ZKT"; // Replace with the actual token symbol
      const tokenDecimals = 18; // Replace with the actual token decimals

      try {
        // Request MetaMask to add the token
        // @ts-ignore
        window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: tokenAddress,
              symbol: tokenSymbol,
              decimals: tokenDecimals,
            },
          },
        });

        console.log("Token added to MetaMask!");
      } catch (error) {
        console.error("Error adding token to MetaMask:", error);
      }
    } else {
      console.error("MetaMask not detected.");
    }
  };

  const handleAddToken = () => {
    metamaskActions();
  };

  return (
    <>
      <div className="flex flex-col justify-start">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
            alt="Your Company"
          />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            ZKAuth demo
          </h2>
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <p className="mt-10 text-center tracking-tight text-gray-900">
            <div>Underlying ERC20 token: ZKT</div>
            <a
              href={tokenEtherscan}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Open token in etherscan
            </a>
            <br />
            <a
              href={contractEtherscan}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Open main contract in etherscan
            </a>
          </p>
          <p className="mt-10 text-center tracking-tight text-gray-900">
            <button
              type="button"
              className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={handleAddToken}
            >
              Add token to Metamask
            </button>
          </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Login
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  value={login}
                  onChange={handleLoginChange}
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Password (no more than 10 characters)
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="text"
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  maxLength={10}
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Recepient (evm address)
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="recepient"
                  name="recepient"
                  type="text"
                  value={recepient}
                  onChange={handleRecepientChange}
                  maxLength={42}
                  minLength={42}
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={handleRegister}
              >
                Sign up
              </button>
            </div>
            <div className="text-center text-sm text-gray-500">or</div>
            <div>
              <button
                type="button"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={handleTransfer}
              >
                Make transfer
              </button>
            </div>
          </form>
          <br />
          {error && (
            <div className="error-toast pt-10">
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Error: {error.substring(0, 100)}
              </p>
            </div>
          )}

          {success && (
            <div className="error-toast">
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {success.substring(0, 100)}
              </p>
              {error}
            </div>
          )}

          {tx && (
            <div>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                <a href={etherscan + tx} target="_blank" rel="noreferrer">
                  Tx: {tx.substring(0, 100)}
                </a>
              </p>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
